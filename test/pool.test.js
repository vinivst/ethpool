const { expectRevert } = require('@openzeppelin/test-helpers');
require("dotenv").config({ path: "../.env" });
const Pool = artifacts.require("Pool");

contract("Pool Test", async accounts => {
    let poolInstance, rewardPool, contractBalance;
    const ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const TEAM_ROLE = '0x9b82d2f38fbdf13006bfa741767f793d917e063392737837b580c1c2b1e0bab3';

    beforeEach(async () => {
        poolInstance = await Pool.new();
    });

    it("Should has been correctly deployed", async () => {
        const isAdmin = await poolInstance.hasRole(ADMIN_ROLE, accounts[0]);
        assert.isTrue(isAdmin, "Contract admin is not set correctly");
    });

    it("Should allow user to deposit", async () => {
        const amount = 1000;
        await poolInstance.sendTransaction({ from: accounts[0], value: amount });
        let balance = await poolInstance.balanceOf(accounts[0]);
        contractBalance = await poolInstance.contractBalance();
        assert.equal(amount, balance.toNumber(), "Account's Contract Balance didn't set correctly");
        assert.equal(amount, contractBalance.toNumber(), "Contract Balance didn't set correctly");
    });

    it("Should allow user to withdraw", async () => {
        const amount = web3.utils.toWei('1', 'ether');
        await poolInstance.sendTransaction({ from: accounts[0], value: amount });
        let balanceBefore = await web3.eth.getBalance(accounts[0]);
        balanceBefore = parseFloat(web3.utils.fromWei(balanceBefore, 'ether'));
        console.log(balanceBefore);
        await poolInstance.withdraw({ from: accounts[0] });
        let balanceAfter = await web3.eth.getBalance(accounts[0]);
        balanceAfter = parseFloat(web3.utils.fromWei(balanceAfter, 'ether'));
        console.log(balanceAfter);
        assert.isAbove(balanceAfter, balanceBefore + 0.9, "Withdraw didn't worked properly");
    });

    it("Can't deposit zero amount", async () => {
        const amount = 0;
        await expectRevert(
            poolInstance.sendTransaction({ from: accounts[0], value: amount }),
            'You need to deposit at least some ether'
        );
    });

    it("Should allow team to deposit a new reward", async () => {
        const amount = 1000;
        await poolInstance.depositReward({ from: accounts[0], value: amount });
        contractBalance = await poolInstance.contractBalance();
        let poolBalance = await poolInstance.poolBalance();
        rewardPool = contractBalance - poolBalance;
        assert.equal(amount, rewardPool, "Reward Pool didn't set correctly");
    });

    it("Shouldn't allow who isn't in the team to deposit", async () => {
        const amount = 1000;
        await expectRevert(
            poolInstance.depositReward({ from: accounts[1], value: amount }),
            `AccessControl: account ${accounts[1].toLowerCase()} is missing role ${TEAM_ROLE}`
        );
    });

    it("Can't deposit zero value reward", async () => {
        const amount = 0;
        await expectRevert(
            poolInstance.depositReward({ from: accounts[0], value: amount }),
            'You need to deposit at least some ether'
        );
    });

    it("Shouldn't allow to add new member to team if isn't admin", async () => {
        await expectRevert(
            poolInstance.addToTeam(accounts[1], { from: accounts[1] }),
            `AccessControl: account ${accounts[1].toLowerCase()} is missing role ${ADMIN_ROLE}`
        );
    });

    it("Shouldn't allow to remove member from the team if isn't admin", async () => {
        await expectRevert(
            poolInstance.removeFromTeam(accounts[1], 0, { from: accounts[1] }),
            `AccessControl: account ${accounts[1].toLowerCase()} is missing role ${ADMIN_ROLE}`
        );
    });

    it("Should allow to add member to team", async () => {
        await poolInstance.addToTeam(accounts[1], { from: accounts[0] })
        const isTeam = await poolInstance.hasRole(TEAM_ROLE, accounts[1], { from: accounts[0] })
        assert.isTrue(isTeam, "New member team didn't set correctly");
    });

    it("Should allow to remove member from the team", async () => {
        await poolInstance.addToTeam(accounts[1], { from: accounts[0] })
        let isTeam = await poolInstance.hasRole(TEAM_ROLE, accounts[1], { from: accounts[0] })
        assert.isTrue(isTeam, "New member team didn't set correctly");
        await poolInstance.removeFromTeam(accounts[1], 1, { from: accounts[0] })
        isTeam = await poolInstance.hasRole(TEAM_ROLE, accounts[1], { from: accounts[0] })
        assert.isFalse(isTeam, "Can't remove member from the team");
    });

    it("Can't withdraw without funds.", async () => {
        await expectRevert(
            poolInstance.withdraw(),
            'Insufficient funds.'
        );
    });

    /* Test Case A 
        Let say we have user A and B and team T.
        A deposits 1 ether, and B deposits 3 for a total of 4 ethers in the pool.
        Now A has 25% of the pool and B has 75%.
        When T deposits 2 ethers rewards, A should be able to withdraw 1.50 and B 4.50 ethers.
    */

    it("Test Case A", async () => {
        const amountA = web3.utils.toWei('1', 'ether');
        const amountB = web3.utils.toWei('3', 'ether');
        const rewardAmount = web3.utils.toWei('2', 'ether');
        await poolInstance.sendTransaction({ from: accounts[0], value: amountA });
        await poolInstance.sendTransaction({ from: accounts[1], value: amountB });
        await poolInstance.depositReward({ from: accounts[0], value: rewardAmount });
        let balanceBeforeA = await web3.eth.getBalance(accounts[0]);
        let balanceBeforeB = await web3.eth.getBalance(accounts[1]);
        balanceBeforeA = parseFloat(web3.utils.fromWei(balanceBeforeA, 'ether'));
        balanceBeforeB = parseFloat(web3.utils.fromWei(balanceBeforeB, 'ether'));
        await poolInstance.withdraw({ from: accounts[0] });
        await poolInstance.withdraw({ from: accounts[1] });
        let balanceAfterA = await web3.eth.getBalance(accounts[0]);
        let balanceAfterB = await web3.eth.getBalance(accounts[1]);
        balanceAfterA = parseFloat(web3.utils.fromWei(balanceAfterA, 'ether'));
        balanceAfterB = parseFloat(web3.utils.fromWei(balanceAfterB, 'ether'));
        assert.isAbove(balanceAfterA, balanceBeforeA + 1.4, "Test Case A failed");
        assert.isAbove(balanceAfterB, balanceBeforeB + 4.4, "Test Case A failed");
    });

    /* Test Case B
        Let say we have user A and B and team T.
        A deposits then T deposits then B deposits then A withdraws and finally B withdraws.
        A should get their deposit + all the rewards.
        B should only get their deposit because rewards were sent to the pool before they participated.
    */

    it("Test Case B", async () => {
        const amountA = web3.utils.toWei('1', 'ether');
        const amountB = web3.utils.toWei('3', 'ether');
        const rewardAmount = web3.utils.toWei('2', 'ether');
        await poolInstance.sendTransaction({ from: accounts[0], value: amountA });
        await poolInstance.depositReward({ from: accounts[0], value: rewardAmount });
        await poolInstance.sendTransaction({ from: accounts[1], value: amountB });
        let balanceBeforeA = await web3.eth.getBalance(accounts[0]);
        let balanceBeforeB = await web3.eth.getBalance(accounts[1]);
        balanceBeforeA = parseFloat(web3.utils.fromWei(balanceBeforeA, 'ether'));
        balanceBeforeB = parseFloat(web3.utils.fromWei(balanceBeforeB, 'ether'));
        await poolInstance.withdraw({ from: accounts[0] });
        await poolInstance.withdraw({ from: accounts[1] });
        let balanceAfterA = await web3.eth.getBalance(accounts[0]);
        let balanceAfterB = await web3.eth.getBalance(accounts[1]);
        balanceAfterA = parseFloat(web3.utils.fromWei(balanceAfterA, 'ether'));
        balanceAfterB = parseFloat(web3.utils.fromWei(balanceAfterB, 'ether'));
        assert.isAbove(balanceAfterA, balanceBeforeA + 2.9, "Test Case B failed");
        assert.isAbove(balanceAfterB, balanceBeforeB + 2.9, "Test Case B failed");
    });


    /* Test Case C
        Let say we have user A and B and team T.
        A deposits 1 then B deposits 3 then T deposits 2 then A deposits 2 then T deposits more 2.
        Finally B withdraws and then A withdraws.
        We have now a pool of 6 and a reward pool of 4 ethers.
        A has 25% of the first reward and 50% of the second reward
        A should get their deposit + 1.50 in rewards in a total of 4.50 ethers.
        B should get 75% of the first reward + 50% of the second one, making 2.50 in rewards + 3 from his initial deposit in a total of 5.50 ethers.
    */

    it.only("Test Case C", async () => {
        const amountA = web3.utils.toWei('1', 'ether');
        const amountB = web3.utils.toWei('3', 'ether');
        const rewardAmount = web3.utils.toWei('2', 'ether');
        await poolInstance.sendTransaction({ from: accounts[0], value: amountA });
        await poolInstance.sendTransaction({ from: accounts[1], value: amountB });
        await poolInstance.depositReward({ from: accounts[0], value: rewardAmount });
        await poolInstance.sendTransaction({ from: accounts[0], value: rewardAmount });
        await poolInstance.depositReward({ from: accounts[0], value: rewardAmount });
        let balanceBeforeA = await web3.eth.getBalance(accounts[0]);
        let balanceBeforeB = await web3.eth.getBalance(accounts[1]);
        balanceBeforeA = parseFloat(web3.utils.fromWei(balanceBeforeA, 'ether'));
        balanceBeforeB = parseFloat(web3.utils.fromWei(balanceBeforeB, 'ether'));
        await poolInstance.withdraw({ from: accounts[1] });
        await poolInstance.withdraw({ from: accounts[0] });
        let balanceAfterA = await web3.eth.getBalance(accounts[0]);
        let balanceAfterB = await web3.eth.getBalance(accounts[1]);
        balanceAfterA = parseFloat(web3.utils.fromWei(balanceAfterA, 'ether'));
        balanceAfterB = parseFloat(web3.utils.fromWei(balanceAfterB, 'ether'));
        assert.isAbove(balanceAfterA, balanceBeforeA + 4.4, "Test Case C failed");
        assert.isAbove(balanceAfterB, balanceBeforeB + 5.4, "Test Case C failed");
    });

});