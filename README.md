# College Equipment Lending DApp

A college needs a shared record of equipment availability and who has borrowed each item. This frontend reads and updates that record through an existing Solidity contract on Ethereum Sepolia. MetaMask signs transactions; the contract enforces permissions.

## Project status

The user reports that the frontend is now working. This is a user-reported status, not independently verified live testing. No per-case live test evidence, screenshots, or transaction receipts were found in the repository during this README update, so individual results remain **Pending documentation**.

## Technology stack

HTML, CSS, JavaScript, **Ethers.js 6.13.5**, Solidity, MetaMask, and **Ethereum Sepolia**. Python 3 provides the local HTTP server; there is no backend or build step.

## Features

- Plain HTML, responsive CSS, and beginner-friendly JavaScript. No build step, React, or backend.
- Ethers.js **6.13.5**, pinned in the CDN URL in `index.html`.
- MetaMask account connection, network switching, balance display, and wallet change handling.
- Real equipment records, IDs starting at zero, availability, and full borrower addresses.
- Admin-only Add Equipment form, Borrow actions, and borrower-only Return actions.
- Wallet approval, submitted, confirmed, cancelled, and failed transaction messages with Etherscan links.
- Contract bytecode check before equipment reads; stale loads are discarded when the wallet changes.
- Equipment names render as text, never as executable HTML.

## Existing deployment

| Setting | Value |
| --- | --- |
| Network | Ethereum Sepolia |
| Chain ID | `11155111` |
| Hex chain ID | `0xaa36a7` |
| Contract | `0xBAc9b5d234744F8ee5197A249A407b812338B4F8` |
| Explorer | [Sepolia contract](https://sepolia.etherscan.io/address/0xBAc9b5d234744F8ee5197A249A407b812338B4F8) |

The address, human-readable ABI, and network settings are grouped at the top of `app.js`. The address is normalized to lowercase when passed to Ethers so supplied letter casing does not cause a checksum error. No contract is modified or redeployed. The app discovers the admin using `admin()`; it does not assume your connected wallet is the deployment account.

## Exact local startup steps

Requirements: Python 3, an internet connection for Ethers/RPC access, and a browser with the MetaMask extension. Use a dedicated test account with Sepolia test ETH for gas.

1. Open a terminal.
2. From the project folder, run (the `cd` below shows this checkout’s location):

   ```sh
   cd /Users/harshashetty/BlockChain-Assignment
   python3 -m http.server 8000
   ```

3. Open **http://127.0.0.1:8000** in the browser where MetaMask is installed. Serve the files over HTTP; do not open `index.html` as a `file://` URL.
4. Keep the terminal running. Stop the server with **Ctrl+C** when done.

There is nothing to install with npm. If the directory is moved, use its new path in the `cd` command. If port 8000 is busy, use 8001 in both the command and URL.

## Solidity source

The repository includes [`contracts/EquipmentLending.sol`](contracts/EquipmentLending.sol). The existing file was inspected and left unchanged; no replacement contract was generated. Its declarations match the frontend ABI, but its exact correspondence to the source used for the existing deployment has not been independently verified.

Before submission, compare it with the original source in your Remix workspace. If it differs, export the **exact original deployed source** from Remix to `contracts/EquipmentLending.sol`; do not reconstruct it from the ABI or redeploy. Keep the original compiler settings/artifact for your compilation evidence.

## Sepolia and faucet ETH

In MetaMask, enable **Show test networks** if necessary, then select **Sepolia**. The expected chain ID is `11155111` (`0xaa36a7`). The frontend also offers **Switch to Sepolia** when another network is selected.

To fund a test account, use a Sepolia faucet, paste only your **public wallet address**, and request Sepolia test ETH. Faucet availability, limits, and eligibility can vary. Wait for the faucet transfer to arrive and click **Refresh** to update the displayed balance. Sepolia test ETH is for testing; this app requires no equipment payment. Adding, borrowing, and returning still consume test ETH for gas.

Approve account access when you click **Connect MetaMask**. For each equipment action, review and approve the separate transaction request in MetaMask, then wait for the frontend confirmation. Cancelling approval does not constitute a contract rejection. Never enter a private key, recovery phrase, or password into this app or a faucet.

## Using the app

1. **Connect:** Click **Connect MetaMask**, select an account in the extension, and approve access. Page load only checks existing access with `eth_accounts`; only the Connect button calls `eth_requestAccounts`. An already authorized account can reconnect automatically without an access prompt.
2. **Network:** If you are on another chain, click **Switch to Sepolia** and approve the switch. If Sepolia is unknown, the app offers MetaMask a Sepolia configuration with a public RPC endpoint. MetaMask still controls approval. You can also enable test networks and select Sepolia directly in MetaMask.
3. **Review:** Check the address, network, balance, and equipment records. An available item's borrower is shown exactly as stored by the contract, usually the zero address. An empty registry displays an empty state.
4. **Add equipment:** Connect the deployment/admin account. The form appears only if it matches the address returned by `admin()`, ignoring letter case. Enter a non-blank name and submit. Surrounding whitespace is removed. Approve in MetaMask and wait for confirmation.
5. **Borrow:** Use **Borrow equipment** on an available card. Approve the transaction and wait for confirmation. There is no ETH payment; gas is paid in Sepolia test ETH.
6. **Return:** Use **Return equipment** when connected as the recorded borrower. Other users see the borrowed status without a Return action.
7. **Refresh:** Reload current contract data and balance with **Refresh**. Changes from other users are not pushed automatically. A confirmed local transaction triggers a refresh automatically.
8. **Change wallets or chains:** Use MetaMask. The app immediately clears prior contract data and loads the new session. Disconnected/locked accounts cannot keep stale admin controls or equipment actions.

Transaction buttons remain disabled while approval or confirmation is pending, even if the account or network changes. An already submitted transaction belongs to its original account/network and may still confirm. If confirmation cannot be determined because of an RPC failure, follow the hash on Etherscan before retrying. MetaMask speed-ups use the replacement hash; cancellations or different replacement actions are reported separately.

A successful receipt means **one confirmation**, not permanent finality. If refreshing fails after confirmation, the app explicitly keeps the transaction marked confirmed and offers Refresh. If an error occurs during estimation, resolve the error; do not bypass it by forcing a gas limit.

## How JavaScript connects to the contract

`new ethers.BrowserProvider(wallet)` wraps MetaMask's injected provider. After checking chain ID, the app verifies deployed bytecode with `getCode()`. An Ethers `Contract` combines the existing address, ABI, and provider for reads. `admin()`, `equipmentCount()`, and `equipment(id)` are read from the same block snapshot, with IDs from `0` through `count - 1`. Reads do not need a transaction or gas payment.

For a write, the app checks the current account and chain, gets the MetaMask signer, and connects it through `contract.connect(signer)`. It simulates the action with `staticCall`, populates the request, and estimates gas before sending; a simulation or estimation failure prevents submission. It calls `addEquipment(name)`, `borrowEquipment(id)`, or `returnEquipment(id)` without an ETH `value`. MetaMask requests approval and Ethers waits for the receipt using `transaction.wait(1)` before data is refreshed. The contract remains the authority for permissions and valid state transitions. The browser console records transaction context, destination, call data, estimated gas, and error stage. A mined failure also triggers a separate lookup of the actual transaction and receipt details; a lookup failure does not hide the original error. An outer wallet routing destination alone does not establish the cause of a failure.

The session version counter prevents slow responses from an old account/network from repopulating the page. Status and equipment DOM nodes use `textContent`, preserving literal names such as `<b>Camera</b>` safely.

## Manual test plan

**All individual results below are “Pending documentation” because supporting per-case live results are not recorded in the repository.** The user’s report that the frontend works does not establish each result in this table. Use at least two test accounts (admin A and student B); a third account C helps test unauthorized returns. Record actual observations and transaction hashes after execution. Prepare an available item before each borrow test.

| Test | Input / setup | Expected result | Actual result |
| --- | --- | --- | --- |
| Missing extension | Open in a browser without MetaMask | Install/enable message; Connect disabled | Pending documentation |
| No automatic access request | Fresh site permission, load page | No account access prompt until Connect is clicked | Pending documentation |
| Wallet connection | Approve Connect on Sepolia | Correct full account, chain, balance, contract records | Pending documentation |
| Wrong chain | Select another network | Old equipment/admin data clears; switch action appears | Pending documentation |
| Network switch | Approve Switch to Sepolia | Chain 11155111 selected and data loads | Pending documentation |
| Switch rejection | Reject network switch | Readable rejection; no equipment transactions enabled | Pending documentation |
| Account change | Switch admin A to student B | Address/balance reload; admin form disappears | Pending documentation |
| Disconnect / lock | Disconnect site or lock MetaMask | Old account/data/actions clear if extension reports no accounts | Pending documentation |
| Bytecode check | Observe valid deployment load; for negative test use a temporary local copy configured with a known empty address | Real deployment loads; empty address reports missing bytecode before ABI reads | Pending documentation |
| Empty registry | Only if existing count is zero | Empty state, no invented cards | Pending documentation |
| Valid admin add | A adds `Digital multimeter` | Confirmation; count increases; new ID equals previous count | Pending documentation |
| Trimmed name | A enters `  Tripod  ` | Stored name is `Tripod` | Pending documentation |
| Blank frontend input | A enters spaces | Form rejects; no wallet approval or transaction | Pending documentation |
| Empty contract input | A calls `addEquipment("")` in Remix | Contract rejects | Pending documentation |
| Unauthorized add | B calls `addEquipment("Camera")` in Remix | Contract rejects; frontend hides form for B | Pending documentation |
| Valid borrow | B borrows available ID | Confirmation; borrowed true; borrower B; Return appears | Pending documentation |
| Double borrow | Borrow already borrowed ID through Remix | Contract rejects | Pending documentation |
| Nonexistent borrow | Borrow ID equal to count through Remix | Contract rejects | Pending documentation |
| Valid return | B returns its borrowed ID | Confirmation; available again; display contract's borrower value | Pending documentation |
| Unauthorized return | C returns B's borrowed ID in Remix | Contract rejects; frontend has no Return for C | Pending documentation |
| Wallet cancellation | Reject an add/borrow/return approval | Cancellation message; no new equipment action approved | Pending documentation |
| Insufficient gas funds | Attempt action from account lacking test ETH | Readable insufficient funds/estimation error; no forced send | Pending documentation |
| Literal equipment name | A adds `<b>Camera</b>` (creates a real test record) | Text appears literally, no HTML execution | Pending documentation |
| Pending controls | Submit action; inspect during confirmation | All transaction controls disabled; submitted hash link visible | Pending documentation |
| Session change during pending | Change account/chain while transaction pending | Stale data clears; original transaction tracked separately | Pending documentation |
| RPC failure | Temporarily use an unreachable wallet RPC, then Refresh | Readable load failure; stale cards/admin cleared | Pending documentation |
| Failure after confirmation | Interrupt RPC during post-receipt refresh if feasible | Status still says confirmed, plus refresh failure | Pending documentation |
| External state change | Another account changes an item; click Refresh | Updated on-chain state appears | Pending documentation |
| Speed-up / cancellation | Use MetaMask replacement while action is pending | Updated hash; speed-up confirms or cancellation is identified | Pending documentation |
| Mobile / keyboard | Resize and navigate with Tab | No horizontal overflow; clear focus and accessible controls | Pending documentation |

### Testing contract-rejected actions in Remix

The normal frontend intentionally blocks blank names and hides unauthorized actions. To verify contract enforcement, use **the exact original Solidity source/artifact** from your assignment in [Remix](https://remix.ethereum.org/). The local source is included at `contracts/EquipmentLending.sol`; confirm that it is the exact source used in Remix for this deployment before using it for evidence.

1. Compile that existing source with its required compiler/settings. Compilation alone does not deploy anything.
2. In **Deploy & Run Transactions**, choose the injected browser/MetaMask environment and confirm Sepolia, chain ID 11155111. Exact UI labels may vary with Remix versions.
3. Select the original contract and use **At Address** with `0xBAc9b5d234744F8ee5197A249A407b812338B4F8`. **Do not click Deploy.** This attaches to the existing deployment.
4. Keep **Value = 0 wei**. Read `admin()`, `equipmentCount()`, and `equipment(id)` to identify accounts and current state.
5. For empty input, connect the admin and call `addEquipment` with `""`. For unauthorized addition, select a non-admin account and enter a nonempty name. For double borrowing or unauthorized return, first prepare an actually borrowed item and call the relevant function from the wrong account. For a nonexistent item, use ID equal to `equipmentCount()`.
6. Capture the returned revert/estimation error and any Solidity reason. If estimation rejects, cancel/stop there. **Do not choose a force-send option.** An estimate rejection is a rejected call, normally without an on-chain hash or gas charge. If a transaction was mined and reverted, record its hash and failed receipt; mined failures consume gas.

A **wallet cancellation** means the person refused an access/signature request; it does not prove that the contract rejected the action. A **contract rejection** means execution or gas estimation hit the contract's validation rules. Use a Solidity revert/failed receipt as evidence for rejection and label the screenshot accurately. The app preserves revert reasons when the RPC provides them; some providers omit the reason.

## Required screenshots

- [ ] Original Solidity compilation success in Remix (not fabricated by this frontend).
- [ ] Existing deployment address and Sepolia network, from the original deployment record or explorer; do not redeploy for this screenshot.
- [ ] Frontend wallet connection showing account, Sepolia, and balance.
- [ ] Successful transaction with confirmation and clickable Sepolia transaction hash.
- [ ] Failed transaction or rejected contract call with readable revert evidence. Wallet cancellation alone is not proof of contract rejection.
- [ ] Actual blockchain data displayed in the frontend, including equipment ID, name, availability, borrower, and updated state.

Use only actual observed contract data, receipts, and screenshots as blockchain evidence. Never provide private keys, recovery phrases, or passwords to the app or in assignment screenshots.

## Remaining before submission

- [ ] Compare `contracts/EquipmentLending.sol` with the exact deployed source from Remix and retain the original compiler settings/artifact.
- [ ] Complete final test documentation: valid addition, borrowing, and returning; invalid inputs and unavailable/nonexistent IDs; unauthorized addition and return; wallet/network handling.
- [ ] Replace each **Pending documentation** result with the actual observation and supporting evidence after verification. Record real transaction hashes only when transactions exist; rejected calls may have no hash.
- [ ] Capture and include every item in the required screenshots checklist: compilation, existing deployment, wallet connection, successful transaction, failed transaction or rejected contract call, and blockchain data shown in the frontend.
- [ ] Prepare the submission PDF with the problem statement, stack, contract address/network, implementation explanation, documented tests, and required screenshots.
- [ ] Include the actual project **GitHub repository link in the submission PDF**, and confirm it opens for the evaluator. No repository URL has been invented here.
- [ ] Review the final repository, screenshots, console output, and PDF for credentials before submitting.

## Local verification versus live verification

Local syntax, HTTP serving, and isolated UI/state checks can validate frontend behavior without signing anything. Simulated provider responses used for development checks are **not blockchain evidence**. Actual MetaMask connection, deployed bytecode/ABI compatibility, admin identity, contract records, balances, revert behavior, transactions, and receipts must be verified manually on Sepolia using the table above. The user reports that the frontend is now working; no independent live-network verification is claimed here.

Reference: [Ethers v6 documentation](https://docs.ethers.org/v6/single-page/).

### Checks performed during creation

- Passed `node --check app.js` with Node.js 22.17.1.
- Passed static checks for unique HTML IDs, matching JavaScript DOM targets, local asset references, the pinned Ethers script URL, and all four requested files.
- Passed isolated simulated-provider checks for missing MetaMask, passive account access, case-insensitive admin recognition, safe literal name rendering, borrower-specific buttons, blank-name blocking, account/network changes, missing bytecode, wallet rejection, control recovery, disconnect cleanup, revert reasons, insufficient funds messages, and confirmed status surviving a failed refresh.
- Local HTTP startup was attempted, but this execution environment blocked socket binding with `PermissionError: Operation not permitted`. HTTP serving and visual browser behavior have not been verified here. Run the startup command on your computer to complete those checks.
- No wallet was accessed and no live Sepolia reads or transactions were performed during these checks. Individual results in the manual test table remain **Pending documentation** until supporting evidence is recorded.

### README update review

The five project files (`index.html`, `style.css`, `app.js`, `README.md`, and `contracts/EquipmentLending.sol`) were inspected for apparent credential assignments, private key blocks, common access-token formats, and possible raw private keys. No apparent credentials were found. Public wallet and contract addresses are expected project data. This inspection does not prove the absence of every possible secret.

This update changes only `README.md`. No Solidity or frontend files were changed, and no commit, push, deployment, or live wallet test was performed.
