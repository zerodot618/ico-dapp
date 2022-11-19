// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IZeroDot618 {
    /**
     * @dev 返回一个由`owner`在其代币列表中给定的 `index` 拥有的令牌ID。
     * 与 {balanceOf} 一起使用，列举所有 owner 的代币。
     */
    function tokenOfOwnerByIndex(address owner, uint256 index)
        external
        view
        returns (uint256 tokenId);

    /**
     * @dev 返回 owner 账户中的代币数量
     */
    function balanceOf(address owner) external view returns (uint256 balance);
}
