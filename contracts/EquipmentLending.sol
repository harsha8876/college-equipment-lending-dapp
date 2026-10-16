// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EquipmentLending {
    address public admin;
    uint256 public equipmentCount;

    struct Equipment {
        string name;
        bool isBorrowed;
        address borrower;
    }

    mapping(uint256 => Equipment) public equipment;

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can add equipment");
        _;
    }

    modifier validItem(uint256 id) {
        require(id < equipmentCount, "Equipment does not exist");
        _;
    }

    function addEquipment(string memory name) public onlyAdmin {
        require(bytes(name).length > 0, "Name cannot be empty");

        equipment[equipmentCount] = Equipment({
            name: name,
            isBorrowed: false,
            borrower: address(0)
        });

        equipmentCount++;
    }

    function borrowEquipment(uint256 id) public validItem(id) {
        Equipment storage item = equipment[id];

        require(!item.isBorrowed, "Equipment already borrowed");

        item.isBorrowed = true;
        item.borrower = msg.sender;
    }

    function returnEquipment(uint256 id) public validItem(id) {
        Equipment storage item = equipment[id];

        require(item.isBorrowed, "Equipment is not borrowed");
        require(
            item.borrower == msg.sender,
            "Only the borrower can return it"
        );

        item.isBorrowed = false;
        item.borrower = address(0);
    }
}