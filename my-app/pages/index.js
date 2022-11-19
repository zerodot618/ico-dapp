import { BigNumber, Contract, providers, utils } from "ethers";
import Head from "next/head";
import React, { useEffect, useRef, useState } from "react";
import Web3Modal, { Provider } from "web3modal";
import {
  NFT_CONTRACT_ABI,
  NFT_CONTRACT_ADDRESS,
  TOKEN_CONTRACT_ABI,
  TOKEN_CONTRACT_ADDRESS,
} from "../constants";
import styles from "../styles/Home.module.css";

export default function Home() {
  // 创建一个大数 0
  const zero = BigNumber.from(0);
  // walletConnected 追踪用户的钱包是否已连接
  const [walletConnected, setWalletConnected] = useState(false);
  // loading 跟踪加载状态
  const [loading, setLoading] = useState(false);
  // tokensToBeClaimed 记录了可以被认领的代币数量，基于用户所持有的尚未认领的 ZeroDot618 NFT
  const [tokensToBeClaimed, setTokensToBeClaimed] = useState(zero);
  // balanceOfZeroDot618Tokens 记录了一个地址所拥有的 ZeroDot618 代币的数量
  const [balanceOfZeroDot618Tokens, setBalanceOfZeroDot618Tokens] = useState(zero);
  // tokenAmount 用户想要铸造的代币的数量
  const [tokenAmount, setTokenAmount] = useState(zero);
  // tokensMinted 是到目前为止已经铸造的代币的总数（最大总供应量: 10000 个）
  const [tokensMinted, setTokensMinted] = useState(zero);
  // isOwner 检查当前连接的MetaMask钱包是否是合约的所有者
  const [isOwner, setIsOwner] = useState(false);
  // 创建一个对Web3 Modal 的引用（用于连接到Metamask），只要页面打开就会持续存在。
  const web3ModalRef = useRef();

  /**
   * 返回一个代表Ethereum RPC的提供者或签署者对象，无论是否有签署能力的metamask附件
   *
   * provider 用于与区块链互动--读取交易、读取余额、读取状态等。
   * signer 是一种特殊类型的 provider，用于需要向区块链进行 "写 "交易的情况，这涉及到连接的账户
   * 需要进行数字签名以授权正在发送的交易
   * Metamask暴露了一个签名者API，允许你的网站使用 Signer 函数向用户请求签名。
   * 
   * @param {*} needSigner - 如果你需要 signer，则为真，否则默认为假。
   */
  const getProviderOrSigner = async (needSigner = false) => {
    // 连接 Metemask
    // 由于我们将 web3Modal 存储为一个引用，我们需要访问 current 值，以获得对底层对象的访问。
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    // 如果用户连接的不是 Goerli 网络，则要抛出错误告知用户
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 5) {
      window.alert("change the network to Goerli");
      throw new Error("Change network to Goerli");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer
    }
    return web3Provider;
  }

  /**
   * getTokensToBeClaimed: 获取用户可以铸币的余额
   */
  const getTokensToBeClaimed = async () => {
    try {
      // 只读操作，只用 provider 即可
      const provider = await getProviderOrSigner();
      // 创建 NFT 合约
      const nfgContract = new Contract(
        NFT_CONTRACT_ABI,
        NFT_CONTRACT_ABI,
        provider,
      );

      // 创建一个ZD618 Token 实例
      const tokenContact = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );
      // 我们现在要让签名人提取当前连接的MetaMask账户的地址
      const signer = await getProviderOrSigner(true);
      // 获取签名者地址
      const address = await signer.getAddress();
      // 调用 NFT 合约获取余额
      const balance = await nfgContract.balanceOf(address);
      // 如果没有 NFT
      if (balance === zero) {
        setTokensToBeClaimed(zero);
      } else {
        // amount 记录未认领的NFT数量
        var amount = 0;
        // 对于所有的NFT，检查代币是否已经被领取
        // 只有在代币尚未认领NFT时才增加金额(对于给定的tokenId)
        for (var i = 0; i < balance; i++) {
          const tokenId = await nfgContract.tokenOfOwnerByIndex(address, i);
          const claimed = await tokenContact.tokenIdsClaimed(tokenId);
          if (!claimed) {
            amount++
          }
        }
        // tokensToBeClaimed 已经被初始化为一个大数，因此我们将把金额转换为一个大数，然后设置其值
        setTokensToBeClaimed(BigNumber.from(amount));
      }
    } catch (error) {
      console.error(error)
      setTokensToBeClaimed(zero)
    }
  }

  /**
   * getBalanceOfZeroDot618Tokens: 检查一个地址所持有的加密开发代币的余额。
   */
  const getBalanceOfZeroDot618Tokens = async () => {
    try {
      // 只读操作，provider 即可
      const provider = await getProviderOrSigner();
      // 创建 token 合约实例
      const tokenContact = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );
      // 获取连接钱包地址，需要 signer
      const signer = await getProviderOrSigner(true);
      // 连接钱包用户的地址
      const address = await signer.getAddress();
      // 获取代币余额
      const balance = await tokenContact.balanceOf(address);
      // 转换大数
      setBalanceOfZeroDot618Tokens(balance);
    } catch (error) {
      console.error(error)
      setBalanceOfZeroDot618Tokens(zero)
    }
  }

  /**
   * mintZeroDot618Token: 为给定的地址 mint amount 数量的代币
   */
  const mintZeroDot618Token = async (amount) => {
    try {
      // 写操作，需要 signer
      const signer = await getProviderOrSigner(true);
      // 创建 token 合约实例
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        signer
      );
      // 每一个代币都是 0.001 ether。我们需要发送的值是 0.001 * amount
      const value = 0.001 * amount;
      const tx = await tokenContract.mint(amount, {
        // 值表示一个ZeroDot618 token 的成本是 0.001 eth
        // 我们正在使用ethers.js的utils库将 0.001 字符串解析为以太
        value: utils.parseEther(value.toString()),
      })
      setLoading(true)
      // 等待 mint 完成
      await tx.wait();
      setLoading(false);
      window.alert("Successfully minted ZeroDot618 Tokens");
      await getBalanceOfZeroDot618Tokens();
      await getTotalTokensMinted();
      await getTokensToBeClaimed();
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * claimZeroDot618Tokens: 帮助用户认领 ZeroDot618 Tokens。
   */
  const claimZeroDot618Tokens = async () => {
    try {
      // 写操作，需要 signer
      const signer = await getProviderOrSigner(true);
      // 创建 token 合约实例
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        signer
      );
      const tx = await tokenContract.claim();
      setLoading(true);
      // 等待 mint 完成
      await tx.wait();
      setLoading(false);
      window.alert("Sucessfully claimed ZeroDot618 Tokens");
      await getBalanceOfZeroDot618Tokens();
      await getTotalTokensMinted();
      await getTokensToBeClaimed();
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * getTotalTokensMinted:检索到目前为止在总供应量中已铸造的代币数量
   */
  const getTotalTokensMinted = async () => {
    try {
      // 读操作，provider 即可
      const provider = await getProviderOrSigner();
      // 创建 token 合约实例
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );
      // 获取所有已铸造的代币
      const _tokensMinted = await tokenContract.totalSupply();
      setTokensMinted(_tokensMinted);
    } catch (err) {
      console.error(err);
    }
  }

  /**
  * getOwner: 通过连接地址获得合约所有者
  */
  const getOwner = async () => {
    try {
      const provider = await getProviderOrSigner();
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );
      // 获取合约所有者
      const _owner = await tokenContract.owner();
      // 获取当前钱包连接签名者
      const signer = await getProviderOrSigner(true);
      // 获取签名者地址
      const address = await signer.getAddress();
      if (address.toLowerCase() === _owner.toLowerCase()) {
        setIsOwner(true);
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  /**
   * withdrawCoins: 通过调用合约约中的 withdraw 函数来提取以太币和代币
   */
  const withdrawCoins = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        signer
      );

      const tx = await tokenContract.withdraw();
      setLoading(true);
      await tx.wait();
      setLoading(false);
      await getOwner();
    } catch (err) {
      console.error(err);
    }
  };

  /**
  * connectWallet: 连接 metamask 钱包
  */
  const connectWallet = async () => {
    try {
      // 从 web3Modal 中获得提供者，在我们的例子中是MetaMask
      // 第一次使用时，它提示用户连接他们的钱包
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  }

  // useEffects 用于对网站状态的变化做出反应
  // 函数调用结束时的数组表示哪些状态变化将触发这一效果
  // 本项目中，只要 walletConnected 的值发生变化，这个效果将被调用
  useEffect(() => {
    // 如果钱包没有连接，创建一个新的Web3Modal实例并连接MetaMask钱包
    if (!walletConnected) {
      // 通过设置参考对象的`current`值，将Web3Modal类分配给参考对象
      // 只要这个页面打开，`current`值就一直存在。
      web3ModalRef.current = new Web3Modal({
        network: "goerli",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();

      getTotalTokensMinted();
      getBalanceOfZeroDot618Tokens();
      getTokensToBeClaimed();
      withdrawCoins();
    }
  }, [walletConnected]);

  /*
       renderButton: 根据dapp的状态返回一个按钮
     */
  const renderButton = () => {
    // 如果我们目前正在等待什么，返回一个加载按钮
    if (loading) {
      return (
        <div>
          <button className={styles.button}>Loading...</button>
        </div>
      );
    }
    // 如果所有者被连接，就会调用 withdrawCoins()
    if (walletConnected && isOwner) {
      return (
        <div>
          <button className={styles.button1} onClick={withdrawCoins}>
            提取代币
          </button>
        </div>
      );
    }
    // 如果要认领的代币大于0，返回一个认领按钮
    if (tokensToBeClaimed > 0) {
      return (
        <div>
          <div className={styles.description}>
            {tokensToBeClaimed * 10} Tokens can be claimed!
          </div>
          <button className={styles.button} onClick={claimZeroDot618Tokens}>
            认领代币
          </button>
        </div>
      );
    }
    // 如果用户没有任何代币可供认领，则显示铸造按钮
    return (
      <div style={{ display: "flex-col" }}>
        <div>
          <input
            type="number"
            placeholder="输入代币数量"
            // BigNumber.from converts the `e.target.value` to a BigNumber
            onChange={(e) => setTokenAmount(BigNumber.from(e.target.value))}
            className={styles.input}
          />
        </div>

        <button
          className={styles.button}
          disabled={!(tokenAmount > 0)}
          onClick={() => mintZeroDot618Token(tokenAmount)}
        >
          铸造代币
        </button>
      </div>
    );
  };

  return (
    <div>
      <Head>
        <title>ZeroDot618 Devs</title>
        <meta name="description" content="ICO-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>欢迎来到 ZeroDot618 Devs ICO!</h1>
          <div className={styles.description}>
            你可以在这里认领并铸造 ZeroDot618 代币
          </div>
          {walletConnected ? (
            <div>
              <div className={styles.description}>
                {/* Format Ether helps us in converting a BigNumber to string */}
                你已经铸造 {utils.formatEther(balanceOfZeroDot618Tokens)} 个 ZeroDot618 代币
              </div>
              <div className={styles.description}>
                {/* Format Ether helps us in converting a BigNumber to string */}
                已经有 {utils.formatEther(tokensMinted)}/10000 个代币被铸造了!!!
              </div>
              {renderButton()}
            </div>
          ) : (
            <button onClick={connectWallet} className={styles.button}>
              连接钱包
            </button>
          )}
        </div>
        <div>
          <img className={styles.image} src="./0.svg" />
        </div>
      </div>

      <footer className={styles.footer}>
        Made with &#10084; by ZeroDot618 Devs
      </footer>
    </div>
  )
}
