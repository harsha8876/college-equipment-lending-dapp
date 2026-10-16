# College Equipment Lending DApp

| Student detail | Value |
| --- | --- |
| Name | Harsha Shetty |
| Registration number | 230905536 |
| Course | Blockchain Technology (CSE4444) |
| Assignment | Blockchain Assignment  |
| Project | College Equipment Lending DApp |

**Repository:** [college-equipment-lending-dapp](https://github.com/harsha8876/college-equipment-lending-dapp) — URL taken from this project's Git `origin` remote.

## Problem statement and purpose

Shared college equipment needs a reliable record of availability and its current borrower. Without a common record, students and staff can lose track of who has an item or attempt to borrow equipment that is already on loan.

This DApp maintains that record in a Solidity smart contract. The admin registers equipment, users borrow available items, and only the recorded borrower can return an item. The browser interface displays the contract's equipment records and uses MetaMask to approve updates on Ethereum Sepolia.

## Features

- Connect MetaMask and display the connected account, network, and Sepolia ETH balance.
- Detect the wrong network and offer a switch to Sepolia.
- List equipment IDs, names, availability, and borrower addresses from the deployed contract.
- Allow only the contract admin to add equipment; hide the addition form for other accounts.
- Borrow available equipment and show Return only to its current borrower.
- Refresh records after confirmed transactions or with the Refresh button.
- Display approval, submitted, confirmed, cancelled, and failure states with transaction links when available.
- Clear stale data when the account or network changes and render equipment names safely as text.

Equipment IDs start at `0`. `equipmentCount()` gives the number of registered items. Adding, borrowing, and returning require gas, but borrowing and returning do not require an ETH payment to the contract.

## Technology stack and project structure

| Technology | Use |
| --- | --- |
| HTML, CSS, JavaScript | Browser interface, responsive styling, and interaction logic |
| Ethers.js **6.13.5** | Contract reads, simulation, gas estimation, and signed transactions; pinned CDN script in `index.html` |
| Solidity | Equipment records and contract permission checks; local source uses `pragma solidity ^0.8.20` |
| MetaMask | Browser wallet, account access, and transaction approval |
| Ethereum Sepolia | Public test network used by the frontend |
| Remix IDE / Remix VM | Solidity compilation, initial local contract tests, and Sepolia contract interaction |
| Python 3 | Local HTTP server |

There is no React, backend service, npm dependency installation, or frontend build step. Internet access is needed to load Ethers.js and reach the wallet's RPC service. Ganache was not used.

```text
.
├── index.html
├── style.css
├── app.js
├── README.md
├── contracts/
│   └── EquipmentLending.sol
└── ScreenShots/
    ├── 01-solidity-compilation.png
    ├── 02-contract-deployed-sepolia.png
    ├── 03-frontend-wallet-connected-and-transaction-confirmed.png
    ├── 03-add-equipment-wallet-approval.png
    ├── 04-frontend-multimeter-borrowed-sepolia.png
    ├── 06-add-equipment-success-remix-vm.png
    ├── 05-borrow-already-borrowed-rejected-remix-vm.png
    └── 06-non-admin-add-equipment-failed-sepolia-receipt.png
```

The Solidity source is [`contracts/EquipmentLending.sol`](contracts/EquipmentLending.sol). `app.js` groups the contract address, human-readable ABI, and network settings near the top of the file.

## Existing Sepolia deployment

| Setting | Value |
| --- | --- |
| Network | Ethereum Sepolia |
| Chain ID | `11155111` |
| Hex chain ID | `0xaa36a7` |
| Contract address | `0xBAc9b5d234744F8ee5197A249A407b812338B4F8` |
| Explorer | [View contract on Sepolia Etherscan](https://sepolia.etherscan.io/address/0xBAc9b5d234744F8ee5197A249A407b812338B4F8) |

The deployment account is the admin. The frontend reads `admin()` and compares addresses without case sensitivity rather than assuming the connected account is an admin.

## Compilation, initial testing, and deployment procedure

Remix VM was used for the initial contract tests. Its simulated accounts and transactions are separate from Sepolia. Screenshots 06 and 07 document Remix VM tests; they are not Sepolia transaction evidence. Ganache was not used.

The compilation and deployment workflow is:

1. Open the project's `contracts/EquipmentLending.sol` source in Remix.
2. Select Solidity compiler **0.8.20**, as shown in screenshot 01, and compile `EquipmentLending.sol`. Preserve the original compiler configuration when reproducing the deployment; optimizer and EVM target settings are not established by the supplied screenshot.
3. For initial tests, choose **Remix VM** in Deploy & Run Transactions, deploy a temporary VM instance, and exercise the functions with VM accounts. The deployment account becomes admin. The supplied evidence includes successful `addEquipment("Calculator")` and rejection of borrowing an already borrowed item.
4. For the Sepolia deployment workflow, select MetaMask's **Sepolia** network, fund the deployment account with faucet test ETH, and select Remix's **Browser Extension / MetaMask** environment. Confirm the network is Sepolia and keep transaction Value at `0 wei`.
5. Select `EquipmentLending`, deploy without constructor arguments, approve the deployment in MetaMask, and wait for confirmation. The existing Sepolia instance is recorded above and shown in screenshot 02.
6. To interact with this project's **existing deployment**, use **At Address / Add Contract** with the configured address. Running the frontend does not require deployment. Do not deploy another contract to use this project.

The local Solidity source and the visible compilation screenshot agree on the displayed contract logic. An exact source-to-deployed-bytecode comparison was not performed as part of this documentation update.

## Run locally

Requirements: Python 3, a browser with MetaMask installed, and an internet connection.

1. Open a terminal in the project folder. For this checkout:

   ```sh
   cd /Users/harshashetty/BlockChain-Assignment
   ```

2. Start the server:

   ```sh
   python3 -m http.server 8000
   ```

3. Open **http://127.0.0.1:8000** in the browser with MetaMask.
4. Keep the terminal running while using the app. Stop it with **Ctrl+C** when finished.

If using a cloned copy, enter that copy's project folder before starting the server. Use HTTP rather than opening `index.html` directly as a file. No npm command is required.

## Using the DApp

1. **Select Sepolia:** In MetaMask, enable test networks if needed and select Sepolia, chain ID `11155111`. If the app detects another network, click **Switch to Sepolia** and approve the switch.
2. **Obtain test ETH:** Request Sepolia ETH from a Sepolia faucet using only your public wallet address. Wait for the transfer and click **Refresh** to update the displayed balance. Test ETH pays gas for equipment transactions.
3. **Connect:** Click **Connect MetaMask**, select an account, and approve account access. The page checks existing permissions silently on load; it requests new account access only after Connect is clicked.
4. **View equipment:** Review each item's ID, name, availability, and borrower. The available state uses the contract's stored borrower value, which this source resets to the zero address.
5. **Add equipment:** Connect the admin account. Enter a non-blank name, such as `Digital Multimeter`, in the visible admin form and click **Add equipment**. The frontend trims surrounding whitespace. Review the MetaMask request, approve it, and wait for confirmation and refreshed records.
6. **Borrow:** Click **Borrow equipment** on an available item, approve in MetaMask, and wait for confirmation. The item's borrower becomes the sender's address.
7. **Return:** Connect the account recorded as borrower and click **Return equipment**. Approve and wait for confirmation. The contract should mark the item available and clear its borrower. Successful return execution is not documented by the supplied screenshots.
8. **Refresh:** Click **Refresh** to reload changes made by other users. Changing accounts or networks clears the previous session's records and admin controls.

The frontend checks the network and contract bytecode before loading data. Ethers.js wraps MetaMask with `BrowserProvider`; the ABI and existing address create the contract instance. Reads use `admin()`, `equipmentCount()`, and `equipment(id)`. Writes use a signer, simulate the action, estimate gas, and send only if the checks succeed. Transaction controls remain disabled while a transaction is pending. A failed refresh after confirmation does not change the transaction's status to failed.

## Tests and observed results

The user reports that the frontend is now working. The observations below are supported by the supplied screenshots and test context. Reviewing these files is not independent live-network execution or receipt verification. Evidence numbers refer to the screenshot sections below.

| Case | Environment / input | Expected result | Observed result and evidence |
| --- | --- | --- | --- |
| Compile contract | Remix, `EquipmentLending.sol` | Compilation succeeds | Screenshot 01 shows Compiled with Solidity 0.8.20. |
| Existing deployment | Sepolia, configured contract | Contract appears in deployed contracts | Screenshot 02 shows EquipmentLending under Sepolia. |
| Wallet connection and admin view | Frontend with admin on Sepolia | Account, network, balance, and admin form displayed | Screenshot 03 shows these details and a confirmed transaction status. |
| Transaction confirmation display | Frontend on Sepolia | Confirmation and explorer link displayed after a transaction | Screenshot 03 shows “Transaction confirmed on Sepolia (one confirmation)” and an explorer link; it does not identify the action by itself. |
| Add Equipment approval | Frontend, `Digital Multimeter` | MetaMask asks for transaction approval | Screenshot 04 shows the approval request. Confirmation is not established by this screenshot alone. |
| Equipment listing | Frontend on Sepolia | Stored equipment and borrowers displayed | Screenshot 05 shows three items: Calculator, Textbook, and Digital Multimeter, with their IDs and availability. |
| Borrowed equipment state | Frontend on Sepolia, Digital Multimeter | Borrowed item shows borrower and Return action for that account | Screenshot 05 shows Digital Multimeter (ID 2) as Borrowed with a borrower and Return button. It documents the stored state, not a separate borrow receipt. |
| Valid admin addition | Remix VM, `addEquipment("Calculator")` | Addition executes successfully | Screenshot 06 shows status 1 and decoded name `Calculator` for `addEquipment(string)`. This is a VM addition, not a Sepolia or borrow transaction. |
| Borrow an already borrowed item | Remix VM, repeated borrow | Contract rejects the second borrow | Screenshot 07 shows rejection with “Equipment already borrowed”; the preceding borrow has a success indicator. |
| Non-admin addition | Sepolia, second account calls `addEquipment("laptop")` | Addition should be rejected by the admin restriction | Screenshot 08 shows the second sender, decoded input `laptop`, and mined status 0. It contains no readable revert reason, so the receipt alone does not establish which validation caused failure. |
| Successful borrower return | Borrower calls `returnEquipment(id)` | Item becomes available; borrower becomes zero address | Not documented. A Return button is not evidence that a return executed. |
| Unauthorized return | Another account returns a borrowed item | Contract rejects the call | Not documented. |
| Empty equipment name | Frontend blank input; contract `addEquipment("")` | Frontend blocks blank input; contract rejects empty string | Not documented as a completed test. |
| Nonexistent equipment | Borrow or return ID equal to `equipmentCount()` | Contract rejects nonexistent ID | Not documented. |
| Return available item | Return an item that is not borrowed | Contract rejects the call | Not documented. |
| Wrong network / account change | Switch chain or account in MetaMask | Wrong-network notice or refreshed account data; no stale controls | Not documented. |
| Wallet cancellation | Cancel a MetaMask approval | Cancellation message; requested transaction is not approved | Not documented. |
| Insufficient gas funds / RPC failure | Unfunded account or unavailable RPC | Readable error; no forced transaction submission | Not documented. |

### Interpreting approval and failure evidence

**Wallet approval request:** MetaMask is asking for permission to submit a transaction. Screenshot 04 captures this stage; it does not prove mining or successful execution.

**Wallet cancellation:** The user rejects the request. This is different from a contract execution failure and does not demonstrate a Solidity restriction. No cancellation result is documented here.

**Contract rejection or execution failure:** Screenshot 07 provides a readable Solidity reason in Remix VM. Screenshot 08 provides a mined Sepolia receipt with status `0`, showing execution failure, but no readable reason. The local source contains the admin restriction, but screenshot 08 must not be described as displaying “Only admin can add equipment”. Mined failures consume gas; a call rejected during simulation or estimation may have no transaction hash.

To test actions hidden by the frontend, attach the original contract in Remix and call the function from the appropriate test account. For Sepolia, attach to the existing address with Value `0 wei`; VM tests must be labelled separately. If simulation or estimation rejects an action, record the rejection rather than force-sending it or increasing the gas limit.

## Screenshots

### 01 — Successful Solidity compilation

![Successful Solidity compilation](ScreenShots/01-solidity-compilation.png)

Successful Solidity compilation in Remix. The compiler panel shows version 0.8.20 and the Compiled indicator for EquipmentLending.

### 02 — Sepolia deployment

![EquipmentLending deployment shown on Sepolia](ScreenShots/02-contract-deployed-sepolia.png)

EquipmentLending deployment shown on Sepolia in Remix's deployed contracts panel with the Browser Extension / MetaMask environment.

### 03 — Connected frontend and confirmation status

![Frontend connected as admin on Sepolia with confirmed transaction status](ScreenShots/03-frontend-wallet-connected-and-transaction-confirmed.png)

Frontend connected as admin on Sepolia with a confirmed transaction status and explorer link. This image alone does not identify which equipment action confirmed.

### 04 — Add Equipment wallet approval

![MetaMask approval request for adding Digital Multimeter](ScreenShots/04-add-equipment-wallet-approval.png)

MetaMask approval request for adding Digital Multimeter. This is an approval request, not proof of confirmation.

### 05 — Blockchain data in the frontend

![Sepolia equipment records including borrowed Digital Multimeter](ScreenShots/05-frontend-multimeter-borrowed-sepolia.png)

Blockchain data displayed in the frontend, including borrowed Digital Multimeter, its borrower address, and a Return button. No successful return is shown.

### 06 — Successful addition in Remix VM

![Successful Calculator addition in Remix VM](ScreenShots/06-add-equipment-success-remix-vm.png)

Successful `addEquipment("Calculator")` in Remix VM, with status 1. This is not a borrow transaction or a Sepolia transaction.

### 07 — Already borrowed rejection in Remix VM

![Remix VM rejection for already borrowed equipment](ScreenShots/07-borrow-already-borrowed-rejected-remix-vm.png)

Remix VM rejection showing “Equipment already borrowed” when borrowing an already borrowed item.

### 08 — Failed non-admin addition on Sepolia

![Failed second-account addition receipt on Sepolia](ScreenShots/08-non-admin-add-equipment-failed-sepolia-receipt.png)

A second account attempted `addEquipment("laptop")` on Sepolia; the receipt shows status 0. No readable revert reason is displayed, so this screenshot is not evidence of a particular revert message.

## Remaining submission material and verification limits

- A submission PDF is not present in the repository. Prepare it with the student details, project explanation, documented tests, screenshots, deployment address, and the GitHub repository link given above.
- Successful return execution and the additional cases marked **Not documented** still lack recorded results. Capture the actual outcomes and relevant evidence to complete that test coverage; do not label them as passed based on implementation alone.
- The provided screenshots were reviewed and their relative image paths checked. No new live wallet transactions, redeployment, or independent source-to-bytecode verification were performed during this README update.

Never include private keys, recovery phrases, or passwords in the repository, screenshots, or submission PDF.
