// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract Pool is AccessControl {
    bytes32 public constant TEAM = keccak256("TEAM");
    uint public poolBalance;
    uint public contractBalance;
    struct DepositObj {
        uint value;
        uint time;
    }
    struct RewardsObj {
        uint value;
        uint time;
        uint totalPooled;
    }
    struct Member {
        address addr;
        bytes32 role;
    }
    mapping(address => DepositObj[]) public deposits;
    mapping(address => uint) public balanceOf;
    RewardsObj[] public rewards;
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

    receive() external payable {
        require(msg.value > 0, "You need to deposit at least some ether");
        uint timeNow = block.timestamp;
        DepositObj memory newDeposit = DepositObj(msg.value, timeNow);
        deposits[msg.sender].push(newDeposit);
        balanceOf[msg.sender] += msg.value;
        contractBalance += msg.value;
        poolBalance += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    function depositReward() public payable onlyRole(TEAM) {
        require(msg.value > 0, "You need to deposit at least some ether");
        uint timeNow = block.timestamp;
        RewardsObj memory newReward = RewardsObj(msg.value, timeNow, poolBalance);
        rewards.push(newReward);
        contractBalance += msg.value;
        emit NewReward(msg.value);
    }

    function withdraw() public {
        require(balanceOf[msg.sender] > 0, "Insufficient funds.");
        uint amount = balanceOf[msg.sender];
        for (uint i = 0; i < deposits[msg.sender].length; i++) {
            for (uint z = 0; z < rewards.length; z++) {
                if(deposits[msg.sender][i].time < rewards[z].time){
                    amount += (deposits[msg.sender][i].value * rewards[z].value) / rewards[z].totalPooled;
                }
            }
        }
        contractBalance -= amount;
        poolBalance -= balanceOf[msg.sender];
        balanceOf[msg.sender] = 0;
        delete deposits[msg.sender];
        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "Failed to send Ether");
        emit Withdrawal(msg.sender, amount);        
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
}