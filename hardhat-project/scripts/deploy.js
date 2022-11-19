const { ethers } = require("hardhat");
require("dotenv").config({ path: ".env" });
const { CRYPTO_DEVS_NFT_CONTRACT_ADDRESS } = require("../constants");

const main = async () => {
  // 获取之前部署过的 ZeroDot618 NFT 合约地址
  const zeroDot618NFTContract = CRYPTO_DEVS_NFT_CONTRACT_ADDRESS;

  /**
   * 在ethers.js中，ContractFactory是一个用于部署新智能合约的抽象。
   * 所以这里的 zeroDot618Contract 是我们的 ZeroDot618 合约实例的工厂。
   */
  const zeroDot618TokenContract = await ethers.getContractFactory("ZeroDot618Token");

  // 部署合约
  const deployedZeroDot618TokenContract = await zeroDot618TokenContract.deploy(
    zeroDot618NFTContract
  );

  // 等待部署完成
  await deployedZeroDot618TokenContract.deployed();

  // 打印合约地址
  console.log("ZeroDot618 Token Contract Address: ", deployedZeroDot618TokenContract.address);

}

// 调用主函数，如果有任何错误则捕捉
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
