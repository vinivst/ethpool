// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract Pool is AccessControl {
    bytes32 public constant TEAM = keccak256("TEAM");
    uint public rewardFactor;
    uint public totalShares;
    mapping (address => User) public user;
    struct User {
        uint shares;
        uint snapshot;
        uint rewards;
    }
    struct Member {
        address addr;
        bytes32 role;
    }
    Member[] public team;

    event Deposit(address sender, uint amount);
    event Withdrawal(address sender, uint amount);
    event NewReward(uint amount);

    constructor () {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(TEAM, msg.sender);
        Member memory newMember = Member(msg.sender, DEFAULT_ADMIN_ROLE);
        team.push(newMember);
    }

    function depositReward() public payable onlyRole(TEAM) {
        require(msg.value > 0, "You need to deposit at least some ether");
        if(totalShares > 0) {
            uint aux = 10000 * msg.value / totalShares;
            rewardFactor += aux;
        }
        emit NewReward(msg.value);
    }

    function getTeam() external view returns(Member[] memory) {
        return team;
    }

    function addToTeam(address _member) public {
        grantRole(TEAM, _member);
        Member memory newMember = Member(_member, TEAM);
        team.push(newMember);
    }

    function removeFromTeam(address _member, uint index) public {
        require(index < team.length);
        revokeRole(TEAM, _member);
        team[index] = team[team.length-1];
        team.pop();
    }


    receive() external payable {
        require(msg.value > 0, "You need to deposit at least some ether");
        if (user[msg.sender].shares > 0) {
            uint sharesAmount = msg.value;
            uint rewards = user[msg.sender].rewards;
            rewards += calculateReward(msg.sender);
            totalShares += sharesAmount;
            sharesAmount += user[msg.sender].shares;
            User memory newUser = User(sharesAmount, rewardFactor, rewards);
            user[msg.sender] = newUser;
        } else {
            totalShares += msg.value;
            User memory newUser = User(msg.value, rewardFactor, 0);
            user[msg.sender] = newUser;
        }
        emit Deposit(msg.sender, msg.value);
    }
    function withdraw() public returns(uint){
        require(user[msg.sender].shares > 0, "Insufficient funds.");
        uint rewards = user[msg.sender].rewards;
        rewards += calculateReward(msg.sender);
        uint deposited = user[msg.sender].shares;
        totalShares -= deposited;
        uint amount = deposited + rewards;
        user[msg.sender].rewards = 0;
        user[msg.sender].shares = 0;
        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "Failed to send Ether");
        emit Withdrawal(msg.sender, amount);   
        return amount;
    }

    function calculateReward(address _user) public view returns(uint){
        uint aux2 = rewardFactor - user[_user].snapshot;
        uint reward = aux2 * user[_user].shares / 10000;
        return reward;
    }
}