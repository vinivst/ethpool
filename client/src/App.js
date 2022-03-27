import React, { Component } from "react";
import Pool from './contracts/Pool.json';
import getWeb3 from "./getWeb3";
import {
  Container,
  Row,
  Col,
  Input,
  Button,
  Card,
  CardText,
  CardBody,
  CardTitle,
  Table,
  CardGroup,
  InputGroup
} from 'reactstrap';

import "./App.css";

class App extends Component {
  state = {
    loaded: false,
    poolAddress: Pool.address,
    amount: 0,
    pool: null,
    accounts: null,
    depositAmount: 0,
    isAdmin: false,
    isTeam: false,
    adminRole: '0x0000000000000000000000000000000000000000000000000000000000000000',
    teamRole: '0x9b82d2f38fbdf13006bfa741767f793d917e063392737837b580c1c2b1e0bab3',
    rewardPool: 0,
    web3: null,
    contractBalance: 0,
    depositRewardAmount: 0,
    team: [],
    newMemberAddr: ''
  };

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();

      const pool = new web3.eth.Contract(
        Pool.abi,
        Pool.networks[networkId] &&
        Pool.networks[networkId].address
      );

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ loaded: true, pool: pool, accounts: accounts, web3: web3 });
      this.listenToAcountChange();
      this.checkRole();
      this.updateContractBalance();
      this.updateRewardPool();
      this.updateTeam();
      this.listenToNewRewardEvent();
      this.listenToNewDepositEvent();
      this.listenToNewWithdrawEvent();
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  listenToNewRewardEvent = () => {
    const { pool } = this.state;
    pool.events.NewReward().on('data', async (evt) => {
      this.updateRewardPool();
    });
  };

  listenToNewDepositEvent = () => {
    const { pool } = this.state;
    pool.events.Deposit().on('data', async (evt) => {
      this.updateContractBalance();
    });
  };

  listenToNewWithdrawEvent = () => {
    const { pool } = this.state;
    pool.events.Withdrawal().on('data', async (evt) => {
      this.updateContractBalance();
    });
  };

  listenToAcountChange = async () => {
    window.ethereum.on('accountsChanged', async () => {
      // Use web3 to get the user's accounts.
      const accounts = await this.state.web3.eth.getAccounts();
      this.setState({
        accounts: accounts,
      });
      this.checkRole();
    });
  };

  checkRole = async () => {
    const isTeam = await this.state.pool.methods.hasRole(this.state.teamRole, this.state.accounts[0]).call();
    const isAdmin = await this.state.pool.methods.hasRole(this.state.adminRole, this.state.accounts[0]).call();
    this.setState({
      isTeam: isTeam,
      isAdmin: isAdmin
    });
  };

  updateRewardPool = async () => {
    const poolBalance = await this.state.pool.methods.poolBalance().call();
    const contractBalance = await this.state.pool.methods.contractBalance().call();
    this.setState({
      rewardPool: contractBalance - poolBalance
    });
  };

  updateContractBalance = async () => {
    const amount = await this.state.pool.methods.contractBalance().call();
    this.setState({
      contractBalance: amount
    });
  };

  updateTeam = async () => {
    const team = await this.state.pool.methods.getTeam().call();
    console.log(team);
    this.setState({
      team: team
    });
  };

  handleAddToTeam = async () => {
    const { accounts, pool, newMemberAddr } = this.state;
    await pool.methods
      .addToTeam(newMemberAddr)
      .send({ from: accounts[0] });
    this.updateTeam();
  };

  handleRemoveFromTeam = async (addr, index) => {
    const { accounts, pool } = this.state;
    await pool.methods
      .removeFromTeam(addr, index)
      .send({ from: accounts[0] });
    this.updateTeam();
  };

  handleInputChange = (event) => {
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;
    this.setState({
      [name]: value,
    });
  };

  handleDeposit = async () => {
    const { depositAmount, accounts, pool, web3 } = this.state;
    await web3.eth.sendTransaction({
      from: accounts[0],
      to: pool._address,
      value: depositAmount,
    });
    this.updateContractBalance();
    alert('Account ' + accounts[0] + ' deposited ' + depositAmount);
  };

  handleWithdraw = async () => {
    const { accounts, pool } = this.state;
    await pool.methods
      .withdraw()
      .send({ from: accounts[0] });
    this.updateRewardPool();
    this.updateContractBalance();
    alert('Account ' + accounts[0] + ' withdrawal successfully!');
  };

  handleDepositReward = async () => {
    const { depositRewardAmount, accounts, pool } = this.state;
    await pool.methods
      .depositReward()
      .send({ from: accounts[0], value: depositRewardAmount });
    this.updateRewardPool();
    this.updateContractBalance();
    alert('Account ' + accounts[0] + ' deposited ' + depositRewardAmount);
  };

  render() {
    if (!this.state.loaded) {
      return <div>Loading Web3, accounts, and contract...You must have Metamask and
        switch to Rinkeby network</div>;
    }
    return (
      <Container>
        <div className="App">
          <Row>
            <Col>
              <h1>ETHPool Demo</h1>
              <br />
            </Col>
          </Row>
          <Row>
            <Col>
              <h2>Invest and earn weekly rewards!</h2>
              <br />
            </Col>
          </Row>
          <Row>
            <Col sm={{
              offset: 3,
              size: 'auto'
            }}>
              <Card
                color="warning"
                inverse
              >
                <CardBody>
                  <CardTitle tag="h4">
                    Rewards Pool: {this.state.rewardPool} wei
                  </CardTitle>
                </CardBody>
              </Card>
              <br />
            </Col>
            <Col sm={{
              offset: 1,
              size: 'auto'
            }}>
              <Card
                color="info"
                inverse
              >
                <CardBody>
                  <CardTitle tag="h4">
                    Contract Balance: {this.state.contractBalance} wei
                  </CardTitle>
                </CardBody>
              </Card>
              <br />
            </Col>
          </Row>
          <Row className="Cards">
            <CardGroup>
              <Card
                body
                color="success"
                inverse
              >
                <CardBody>
                  <CardTitle tag="h5">Deposit</CardTitle>
                  <CardText>Amount to Deposit in Wei:</CardText>
                  <InputGroup>
                    <Input
                      type="number"
                      name="depositAmount"
                      value={this.state.depositAmount}
                      onChange={this.handleInputChange}
                    />
                    <Button
                      color="primary"
                      onClick={this.handleDeposit}
                    >
                      Deposit Now
                    </Button>
                  </InputGroup>
                </CardBody>
              </Card>
              <Card
                body
                inverse
                style={{
                  backgroundColor: '#333',
                  borderColor: '#333'
                }}
              >
                <CardBody>
                  <CardTitle tag="h5">Withdraw</CardTitle>
                  <CardText>Withdraw all ether</CardText>
                  <Button
                    color="danger"
                    onClick={this.handleWithdraw}
                  >
                    Withdraw Now
                  </Button>
                </CardBody>
              </Card>
            </CardGroup>
          </Row>
          <br />
          {this.state.isTeam ? <Row className="Cards">
            <Col>
              <Card
                body
                color="secondary"
                inverse
              >
                <CardBody>
                  <CardTitle tag="h5">Deposit to Reward Pool</CardTitle>
                  <CardText>Amount in Wei:</CardText>
                  <InputGroup>
                    <Input
                      type="number"
                      name="depositRewardAmount"
                      value={this.state.depositRewardAmount}
                      onChange={this.handleInputChange}
                    />
                    <Button
                      color="primary"
                      onClick={this.handleDepositReward}
                    >
                      Deposit Reward Now
                    </Button>
                  </InputGroup>
                </CardBody>
              </Card>
            </Col>
          </Row> : ''}
          <br />
          {this.state.isAdmin ? <div>
            <Row>
              <Col>
                <h1>Team Members</h1>
                <Table bordered
                  dark
                  hover
                  responsive
                  striped>
                  <thead>
                    <tr>
                      <th>Address</th>
                      <th>Role</th>
                      <th>Remove from Team</th>
                    </tr>
                  </thead>
                  <tbody>
                    {this.state.team.map((member, index) => (
                      <tr key={member.addr}>
                        <td>{member.addr}</td>
                        <td>{member.role === this.state.adminRole ? 'ADMIN' : 'TEAM'}</td>
                        <td>
                          <Button
                            color="danger"
                            disabled={this.state.isAdmin}
                            onClick={() => {
                              this.handleRemoveFromTeam(member.addr, index)
                            }}
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Col>
            </Row>
            <br />
            <Row className="Cards">
              <Col>
                <Card
                  body
                  color="dark"
                  inverse
                >
                  <CardBody>
                    <CardTitle tag="h5">Add Member to the Team</CardTitle>
                    <CardText>Address:</CardText>
                    <InputGroup>
                      <Input
                        type="text"
                        name="newMemberAddr"
                        value={this.state.newMemberAddr}
                        onChange={this.handleInputChange}
                      />
                      <Button
                        color="primary"
                        onClick={this.handleAddToTeam}
                      >
                        Add Team Member
                      </Button>
                    </InputGroup>
                  </CardBody>
                </Card>
              </Col>
            </Row>
          </div> : ''}
        </div>
      </Container >
    );
  }
}

export default App;
