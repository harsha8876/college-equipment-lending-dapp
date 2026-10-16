/* Deployment settings: this app uses the existing contract. */
const CONTRACT_ADDRESS = "0xBAc9b5d234744F8ee5197A249A407b812338B4F8";
const CONTRACT_ABI = [
  "function admin() view returns (address)",
  "function equipmentCount() view returns (uint256)",
  "function equipment(uint256) view returns (string name, bool isBorrowed, address borrower)",
  "function addEquipment(string name)",
  "function borrowEquipment(uint256 id)",
  "function returnEquipment(uint256 id)"
];
const SEPOLIA = {
  name: "Ethereum Sepolia",
  chainId: 11155111n,
  hexChainId: "0xaa36a7",
  explorer: "https://sepolia.etherscan.io",
  rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"]
};

const ui = {
  connect: document.getElementById("connect-button"),
  switchNetwork: document.getElementById("switch-button"),
  address: document.getElementById("wallet-address"),
  network: document.getElementById("wallet-network"),
  balance: document.getElementById("wallet-balance"),
  walletMessage: document.getElementById("wallet-message"),
  admin: document.getElementById("admin-panel"),
  form: document.getElementById("equipment-form"),
  name: document.getElementById("equipment-name"),
  add: document.getElementById("add-button"),
  formError: document.getElementById("form-error"),
  transaction: document.getElementById("transaction-status"),
  refresh: document.getElementById("refresh-button"),
  total: document.getElementById("equipment-total"),
  listMessage: document.getElementById("list-message"),
  list: document.getElementById("equipment-list")
};

let wallet;
let provider;
let contract;
let account = "";
let admin = "";
let items = [];
let ready = false;
let loading = false;
let walletBusy = false;
let transactionPending = false;
// Each wallet/data reload gets a new version. Old async responses cannot update the UI.
let sessionVersion = 0;

function sameAddress(first, second) {
  return Boolean(first && second && first.toLowerCase() === second.toLowerCase());
}

function updateButtons() {
  ui.connect.disabled = !wallet || walletBusy || loading || transactionPending;
  ui.connect.textContent = walletBusy ? "Check MetaMask…" : account ? "Reconnect MetaMask" : "Connect MetaMask";
  ui.switchNetwork.disabled = walletBusy || loading || transactionPending;
  ui.refresh.disabled = !wallet || walletBusy || loading || transactionPending;
  ui.add.disabled = !ready || transactionPending;
  ui.name.disabled = transactionPending;
  ui.list.querySelectorAll("button").forEach(button => {
    button.disabled = !ready || transactionPending;
  });
}

function clearWalletData() {
  provider = null;
  contract = null;
  account = "";
  admin = "";
  items = [];
  ready = false;
  ui.address.textContent = "Not connected";
  ui.network.textContent = "Not connected";
  ui.balance.textContent = "—";
  ui.admin.hidden = true;
  ui.switchNetwork.hidden = true;
  ui.formError.textContent = "";
  ui.total.textContent = "—";
  ui.list.replaceChildren();
}

// Use textContent for ALL contract/user strings, never HTML interpolation.
function element(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

function renderEquipment() {
  ui.list.replaceChildren();
  ui.total.textContent = String(items.length);
  ui.listMessage.textContent = items.length ? "Live contract records. Refresh to check for changes from other wallets." : "No equipment yet. The admin can add the first item.";
  for (const item of items) {
    const card = element("article", "", "equipment-card");
    const top = element("div", "", "card-top");
    top.append(element("span", `ITEM #${item.id}`, "item-id"),
      element("span", item.isBorrowed ? "Borrowed" : "Available", `badge${item.isBorrowed ? " borrowed" : ""}`));
    const details = document.createElement("dl");
    details.append(element("dt", "Borrower"), element("dd", item.borrower, "address"));
    card.append(top, element("h3", item.name), details);
    const mine = sameAddress(account, item.borrower);
    if (!item.isBorrowed || mine) {
      const button = element("button", mine && item.isBorrowed ? "Return equipment" : "Borrow equipment");
      button.type = "button";
      button.setAttribute("aria-label", `${button.textContent}: ${item.name} (ID ${item.id})`);
      button.addEventListener("click", () => runTransaction(item.isBorrowed ? "returnEquipment" : "borrowEquipment", item.id));
      card.append(button);
    } else {
      card.append(element("p", "On loan to another account", "borrowed-note"));
    }
    ui.list.append(card);
  }
  updateButtons();
}

function transactionStatus(state, message, hash) {
  ui.transaction.dataset.state = state;
  ui.transaction.replaceChildren(element("p", message));
  if (hash) {
    const link = element("a", "View transaction on Sepolia Etherscan ↗");
    link.href = `${SEPOLIA.explorer}/tx/${hash}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    ui.transaction.append(link);
  }
}

// Wallet errors can wrap the original RPC error several levels deep.
function conciseErrorText(message) {
  // Ethers' full message may append a serialized request/receipt after the summary.
  return String(message).split("\n")[0].split(/\s+\((?:action|code|error|transaction|receipt)=/)[0].slice(0, 240);
}

function readableError(error) {
  const errors = [error, error?.error, error?.info?.error, error?.info?.error?.data, error?.data?.originalError].filter(Boolean);
  const hasCode = code => errors.some(entry => entry.code === code);
  const messages = errors.map(entry => entry.message || "").join(" ");
  if (hasCode(4001) || hasCode("ACTION_REJECTED")) return "Request cancelled in MetaMask. No new transaction was approved.";
  if (hasCode("INSUFFICIENT_FUNDS") || /insufficient funds/i.test(messages)) return "Insufficient Sepolia test ETH for gas. Add test ETH to this account and try again.";
  if (hasCode(4902)) return "Sepolia is not configured in MetaMask. Enable test networks or add Sepolia, then reconnect.";
  if (hasCode(4900) || hasCode(4901)) return "MetaMask is disconnected from the network. Reconnect the wallet and try again.";
  if (hasCode(-32002)) return "A MetaMask request is already open. Complete it in the extension.";
  const reason = errors.map(entry => entry.reason || entry.revert?.args?.[0]).find(value => typeof value === "string" && value);
  if (reason) return `Contract rejected the call: ${conciseErrorText(reason)}`;
  if (error?.shortMessage) return conciseErrorText(error.shortMessage);
  const revertMessage = errors.map(entry => entry.message).find(message => /execution reverted/i.test(message || ""));
  if (revertMessage) return `Contract rejected the call: ${conciseErrorText(revertMessage)}`;
  if (hasCode("CALL_EXCEPTION")) return "Contract call failed or was rejected. No readable revert reason was returned. Check the item, permissions, and RPC connection.";
  if (hasCode("NETWORK_ERROR") || hasCode("SERVER_ERROR") || hasCode("TIMEOUT") || /fetch|network|timeout|rate limit/i.test(messages)) return "RPC connection failed. Check MetaMask's network connection and try Refresh.";
  return error?.message ? conciseErrorText(error.message) : "The request failed. Check MetaMask and try again.";
}

async function loadWalletData() {
  const version = ++sessionVersion;
  clearWalletData();
  loading = true;
  ui.list.setAttribute("aria-busy", "true");
  ui.walletMessage.textContent = "Checking wallet and network…";
  ui.listMessage.textContent = "Loading equipment from the contract…";
  updateButtons();
  try {
    // eth_accounts only reads already granted access; it never prompts for access.
    const [accounts, chainHex] = await Promise.all([
      wallet.request({ method: "eth_accounts" }),
      wallet.request({ method: "eth_chainId" })
    ]);
    if (version !== sessionVersion) return;
    const onSepolia = BigInt(chainHex) === SEPOLIA.chainId;
    account = accounts[0] || "";
    ui.address.textContent = account || "Not connected";
    ui.network.textContent = onSepolia ? SEPOLIA.name : `Wrong network (chain ID ${BigInt(chainHex)})`;
    ui.switchNetwork.hidden = onSepolia;
    if (!account || !onSepolia) {
      ui.walletMessage.textContent = !onSepolia ? "Switch to Ethereum Sepolia to use this deployment." : "Click Connect MetaMask to grant account access.";
      ui.listMessage.textContent = "Connect an account on Sepolia to load equipment.";
      return;
    }

    const currentProvider = new ethers.BrowserProvider(wallet);
    const currentContract = new ethers.Contract(CONTRACT_ADDRESS.toLowerCase(), CONTRACT_ABI, currentProvider);
    // Read one block snapshot so count, equipment, admin, and balance agree.
    const blockTag = await currentProvider.getBlockNumber();
    const code = await currentProvider.getCode(CONTRACT_ADDRESS.toLowerCase(), blockTag);
    if (version !== sessionVersion) return;
    if (code === "0x") throw new Error("No contract bytecode exists at the configured Sepolia address. Check the deployment settings.");
    const [adminAddress, count, balance] = await Promise.all([
      currentContract.admin({ blockTag }),
      currentContract.equipmentCount({ blockTag }),
      currentProvider.getBalance(account, blockTag)
    ]);
    const loadedItems = [];
    // Small batches avoid sending an unbounded number of RPC requests at once.
    for (let start = 0n; start < count; start += 8n) {
      if (version !== sessionVersion) return;
      const batch = [];
      for (let id = start; id < count && id < start + 8n; id++) {
        batch.push(currentContract.equipment(id, { blockTag }).then(item => ({
          id, name: item.name, isBorrowed: item.isBorrowed, borrower: item.borrower
        })));
      }
      loadedItems.push(...await Promise.all(batch));
    }
    if (version !== sessionVersion) return;
    provider = currentProvider;
    contract = currentContract;
    admin = adminAddress;
    items = loadedItems;
    ready = true;
    ui.balance.textContent = `${ethers.formatEther(balance)} Sepolia ETH`;
    ui.admin.hidden = !sameAddress(account, admin);
    ui.walletMessage.textContent = sameAddress(account, admin) ? "Connected as admin. Contract bytecode verified on Sepolia." : "Connected as student. Contract bytecode verified on Sepolia.";
    renderEquipment();
  } catch (error) {
    if (version !== sessionVersion) return;
    ready = false;
    ui.admin.hidden = true;
    ui.list.replaceChildren();
    ui.total.textContent = "—";
    ui.walletMessage.textContent = readableError(error);
    ui.listMessage.textContent = "Equipment could not be loaded. Use Refresh to retry.";
    throw error;
  } finally {
    if (version === sessionVersion) {
      loading = false;
      ui.list.setAttribute("aria-busy", "false");
      updateButtons();
    }
  }
}

async function refreshSafely() {
  try { await loadWalletData(); } catch { /* The load error is already shown in the wallet panel. */ }
}

async function runTransaction(method, argument) {
  if (!ready || transactionPending) return;
  transactionPending = true;
  const version = sessionVersion;
  const sender = account;
  const activeProvider = provider;
  const activeContract = contract;
  let hash;
  let stage = "wallet checks";
  updateButtons();
  transactionStatus("checking", "Checking transaction…");
  try {
    // Recheck immediately before requesting a signature; never force a gas limit.
    const [chain, accounts] = await Promise.all([
      wallet.request({ method: "eth_chainId" }), wallet.request({ method: "eth_accounts" })
    ]);
    if (BigInt(chain) !== SEPOLIA.chainId) throw new Error("Wrong network. Switch to Ethereum Sepolia and try again.");
    if (version !== sessionVersion || !sameAddress(accounts[0], sender)) throw new Error("The wallet account or network changed. Review the refreshed page before trying again.");
    const signer = await activeProvider.getSigner(sender);
    if (version !== sessionVersion) throw new Error("Wallet changed. Please try again with the current account.");
    const writeContract = activeContract.connect(signer);
    const action = writeContract.getFunction(method);

    console.log("Transaction context:", {
      account: await signer.getAddress(),
      contract: await writeContract.getAddress(),
      method,
      argument: String(argument)
    });

    stage = "simulation";
    // Simulates without persisting changes or spending gas.
    await action.staticCall(argument);

    stage = "gas estimation";
    const request = await action.populateTransaction(argument);
    const estimatedGas = await action.estimateGas(argument);

    console.log("Transaction diagnostics:", {
      to: request.to,
      data: request.data,
      estimatedGas: estimatedGas.toString()
    });

    // The extra preflight requests take time; recheck the session before sending.
    stage = "wallet checks";
    const [latestChain, latestAccounts] = await Promise.all([
      wallet.request({ method: "eth_chainId" }), wallet.request({ method: "eth_accounts" })
    ]);
    if (BigInt(latestChain) !== SEPOLIA.chainId) throw new Error("Wrong network. Switch to Ethereum Sepolia and try again.");
    if (version !== sessionVersion || !sameAddress(latestAccounts[0], sender)) throw new Error("The wallet account or network changed. Review the refreshed page before trying again.");

    stage = "submission";
    transactionStatus("approval", "Waiting for wallet approval… Review the request in MetaMask.");
    // No ETH value or gas limit override is sent.
    const transaction = await action.send(argument);
    hash = transaction.hash;
    stage = "confirmation";
    transactionStatus("submitted", "Transaction submitted. Waiting for one Sepolia confirmation…", hash);
    let receipt;
    try {
      receipt = await transaction.wait(1);
    } catch (error) {
      // MetaMask's speed-up replaces the hash; cancellation is a different outcome.
      if (error.code !== "TRANSACTION_REPLACED") throw error;
      console.log("Transaction replacement during confirmation:", error);
      hash = error.replacement?.hash || error.receipt?.hash || hash;
      if (error.cancelled) {
        transactionStatus("cancelled", "The transaction was cancelled or replaced with a different action. The requested equipment action was not confirmed.", hash);
        return;
      }
      receipt = error.receipt;
    }
    if (!receipt || receipt.status !== 1) {
      const failure = new Error("The transaction was mined but failed. Check its receipt on Etherscan.");
      failure.code = "TRANSACTION_FAILED";
      failure.receipt = receipt;
      throw failure;
    }
  } catch (error) {
    console.error(`Transaction error during ${stage}:`, error);
    const failedReceipt = error.receipt;
    const minedFailure = failedReceipt?.status === 0;
    if (failedReceipt?.hash) hash = failedReceipt.hash;
    if (hash && !minedFailure && error.code !== "CALL_EXCEPTION" && error.code !== "TRANSACTION_FAILED") {
      transactionStatus("uncertain", `Could not confirm the transaction: ${readableError(error)} Check Etherscan before retrying; it may still be pending.`, hash);
    } else {
      transactionStatus("failed", `${stage}: ${readableError(error)}`, hash);
    }
    if (minedFailure && failedReceipt.hash) {
      // A wallet may route the outer transaction. Log facts without assuming a cause.
      try {
        const actualTransaction = await activeProvider.getTransaction(error.receipt.hash);
        console.log("Mined transaction diagnostics:", {
          hash: failedReceipt.hash,
          to: actualTransaction?.to,
          data: actualTransaction?.data,
          gasLimit: actualTransaction?.gasLimit?.toString(),
          gasUsed: failedReceipt.gasUsed?.toString(),
          status: failedReceipt.status
        });
        if (!actualTransaction) console.warn("Diagnostic lookup returned no transaction. The original error is shown above.");
      } catch (diagnosticError) {
        console.warn("Diagnostic transaction lookup failed; the original transaction error is shown above:", diagnosticError);
      }
    }
    return;
  } finally {
    // Keep controls locked through confirmation, including account/network changes.
    transactionPending = false;
    updateButtons();
  }

  transactionStatus("confirmed", "Transaction confirmed on Sepolia (one confirmation).", hash);
  if (version !== sessionVersion) {
    transactionStatus("confirmed", "Transaction confirmed for the previous wallet session. Refresh on Sepolia to see current data.", hash);
    return;
  }
  if (method === "addEquipment") ui.name.value = "";
  // A refresh failure must never relabel a confirmed transaction as failed.
  try {
    await loadWalletData();
  } catch (error) {
    transactionStatus("confirmed", `Transaction confirmed. The data refresh failed: ${readableError(error)} Use Refresh to retry.`, hash);
  }
}

async function connectWallet() {
  if (!wallet || walletBusy || transactionPending) return;
  walletBusy = true;
  updateButtons();
  try {
    // This is the ONLY account access request, and runs only after clicking Connect.
    await wallet.request({ method: "eth_requestAccounts" });
    await refreshSafely();
  } catch (error) {
    ui.walletMessage.textContent = readableError(error);
  } finally {
    walletBusy = false;
    updateButtons();
  }
}

async function switchToSepolia() {
  if (!wallet || walletBusy || transactionPending) return;
  walletBusy = true;
  updateButtons();
  try {
    try {
      await wallet.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA.hexChainId }] });
    } catch (error) {
      if (error.code !== 4902 && error?.data?.originalError?.code !== 4902) throw error;
      await wallet.request({ method: "wallet_addEthereumChain", params: [{
        chainId: SEPOLIA.hexChainId, chainName: SEPOLIA.name,
        nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: SEPOLIA.rpcUrls, blockExplorerUrls: [SEPOLIA.explorer]
      }] });
      await wallet.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA.hexChainId }] });
    }
    await refreshSafely();
  } catch (error) {
    ui.walletMessage.textContent = readableError(error);
  } finally {
    walletBusy = false;
    updateButtons();
  }
}

ui.connect.addEventListener("click", connectWallet);
ui.switchNetwork.addEventListener("click", switchToSepolia);
ui.refresh.addEventListener("click", refreshSafely);
ui.form.addEventListener("submit", event => {
  event.preventDefault();
  const name = ui.name.value.trim();
  ui.formError.textContent = "";
  if (!name) { ui.formError.textContent = "Enter a non-blank equipment name."; return; }
  if (!sameAddress(account, admin)) { ui.formError.textContent = "Only the contract admin can add equipment."; return; }
  runTransaction("addEquipment", name);
});

function initialize() {
  if (typeof ethers === "undefined") {
    ui.walletMessage.textContent = "Ethers.js could not load. Check your internet connection and reload the page.";
    ui.connect.disabled = true;
    return;
  }
  // Prefer MetaMask if multiple extensions use the legacy providers array.
  wallet = window.ethereum?.providers?.find(candidate => candidate.isMetaMask)
    || (window.ethereum?.isMetaMask ? window.ethereum : null);
  if (!wallet) {
    ui.walletMessage.textContent = "MetaMask extension not detected. Install or enable MetaMask, then reload this page.";
    updateButtons();
    return;
  }
  wallet.on("accountsChanged", refreshSafely);
  wallet.on("chainChanged", refreshSafely);
  wallet.on("connect", refreshSafely);
  wallet.on("disconnect", () => {
    ++sessionVersion;
    clearWalletData();
    loading = false;
    ui.list.setAttribute("aria-busy", "false");
    ui.walletMessage.textContent = "MetaMask disconnected. Reconnect and refresh to continue.";
    ui.listMessage.textContent = "Wallet disconnected. Equipment data has been cleared.";
    updateButtons();
  });
  refreshSafely();
}
initialize();
