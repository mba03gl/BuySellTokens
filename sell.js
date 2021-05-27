"use strict";

const Env = require("./env.json");
Object.assign(process.env, Env);

const ethers = require("ethers");

const sellToken = process.env.SELL_TOKEN;
const sellAmount = ethers.utils.parseUnits(process.env.SELL_AMOUNT, "ether"); // sell in a previously purchased token
const slippage = process.env.SLIPPAGE;

const wbnb = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const pcs = "0x10ED43C718714eb63d5aA57B78B54704E256024E";

const provider = new ethers.providers.WebSocketProvider(
  process.env.BSC_NODE_WSS
);
const wallet = ethers.Wallet.fromMnemonic(process.env.MNEMONIC);
const account = wallet.connect(provider);

const router = new ethers.Contract(
  pcs,
  [
    "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)",
    "function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external",
  ],
  account
);

const sellContract = new ethers.Contract(
  sellToken,
  [
    "function approve(address _spender, uint256 _value) public returns (bool success)",
  ],
  account
);

async function sell() {
  console.log("Approving " + sellAmount + "(in gewi)");
  await sellContract.approve(pcs, sellAmount);
  const amounts = await router.getAmountsOut(sellAmount, [sellToken, wbnb]);
  const amountOutMin = amounts[1].sub(amounts[1].div(slippage));
  console.log(`
    Selling Token
    =================
    tokenIn: ${sellAmount.toString()}
    tokenOut: ${amountOutMin.toString()} ${sellToken} 
  `);
  const tx = await router.swapExactTokensForETHSupportingFeeOnTransferTokens(
    sellAmount,
    amountOutMin,
    [sellToken, wbnb],
    process.env.RECIPIENT,
    Date.now() + 1000 * 60 * 5, //5 minutes
    {
      gasLimit: 345684,
      gasPrice: ethers.utils.parseUnits("6", "gwei"),
    }
  );
  const receipt = await tx.wait();
  console.log("Transaction receipt");
  console.log(receipt);
  process.exit();
}
sell();
