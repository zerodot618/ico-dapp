// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IZeroDot618.sol";

contract ZeroDot618Token is ERC20, Ownable {
    // 一个 ZeroDot618 代币的价格
    uint256 public constant tokenPrice = 0.001 ether;

    // 每个NFT将给用户10个代币
    // 它需要表示为 10 * (10 ** 18)，因为ERC20代币是用代币可能的最小面额表示的。
    // 默认情况下，ERC20代币的最小面额为10^（-18）。这意味着，拥有(1)的余额，实际上等于（10 ^ -18）个代币。
    // 拥有1个完整的代币相当于拥有(10^18)个代币，当你考虑到小数位时。
    uint256 public constant tokensPerNFT = 10 * 10**18;
    // ZeroDot618 代币的最大总供应量为 10000
    uint256 public constant maxTotalSupply = 10000 * 10**18;
    // ZeroDot618 NFT 合约实例
    IZeroDot618 ZeroDot618NFT;
    // 追踪哪些tokenIds已经被认领的映射
    mapping(uint256 => bool) public tokenIdsClaimed;

    constructor(address _zeroDot618NFTContract)
        ERC20("ZeroDot619 Token", "ZD618")
    {
        ZeroDot618NFT = IZeroDot618(_zeroDot618NFTContract);
    }

    /**
     * @dev 铸造 amount 数量的 ZeroDot618Tokens
     * 要求:
     * - msg.value 应该等于或大于 tokenPrice * amount
     */
    function mint(uint256 amount) public payable {
        // 应该等于或大于 tokenPrice * amount 的以太值
        uint256 _requiredAmount = tokenPrice * amount;
        require(msg.value >= _requiredAmount, "Ether sent is incorrect");
        // total tokens(剩余供应) + amount <= 10000，否则将回滚交易。
        uint256 amountWithDecimals = amount * 10**18;
        require(
            (totalSupply() + amountWithDecimals) <= maxTotalSupply,
            "Exceeds the max tool supply available"
        );
        // 从Openzeppelin的ERC20合约中调用内部函数
        _mint(msg.sender, amountWithDecimals);
    }

    /**
     * @dev 根据发送方持有的NFT的数量来铸造代币
     * 要求：
     * - 发送方拥有的 ZeroDot618 NFT 的余额应大于0
     * - 发送方拥有的所有NFT的代币应该没有被认领
     */
    function claim() public {
        address sender = msg.sender;
        // 获取给定发件人地址所持有的 ZeroDot618 NFT 的数量
        uint256 balance = ZeroDot618NFT.balanceOf(sender);
        // 如果余额为零，则回滚交易
        require(balance > 0, "You dont own any ZeroDot NFT's");
        // 追踪无人认领的 tokenIds 的数量
        uint256 amount;
        // 对 balance 进行循环，并获得由 sender 在其token列表的给定 index 拥有的token ID
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = ZeroDot618NFT.tokenOfOwnerByIndex(sender, i);
            // 如果该tokenId没有被认领，则增加 amount
            if (!tokenIdsClaimed[tokenId]) {
                amount += 1;
                tokenIdsClaimed[tokenId] = true;
            }
        }
        // 如果所有的 token Ids 都被认领了，则回滚交易
        require(amount > 0, "You have already claimed all the tokens");
        // 从Openzeppelin的ERC20合约中调用内部函数
        // 为每个NFT铸造amount * 10 个代币
        _mint(msg.sender, amount * tokensPerNFT);
    }

    /**
     * @dev withdraw 提取所有发送到合约的ETH和代币
     */
    function withdraw() public onlyOwner {
        address _owner = owner();
        uint256 amount = address(this).balance;
        (bool sent, ) = _owner.call{value: amount}("");
        require(sent, "Failed to send Ether");
    }

    // 接收以太的函数，msg.data 必须是空的
    receive() external payable {}

    // 当 msg.data 不为空时，会调用 fallback 函数
    fallback() external payable {}
}
