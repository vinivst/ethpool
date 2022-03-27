let Pool = artifacts.require('Pool.sol');
require('dotenv').config({ path: '../.env' });

module.exports = async function (deployer) {
    await deployer.deploy(
        Pool
    );
};
