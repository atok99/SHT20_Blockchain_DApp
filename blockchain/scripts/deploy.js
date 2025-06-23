async function main() {
  // Dapatkan provider dan signer
  const provider = ethers.provider;
  const [deployer] = await ethers.getSigners();
  
  console.log("Deployer address:", deployer.address);

  // Verifikasi chainId
  const network = await provider.getNetwork();
  console.log("Chain ID:", network.chainId);

  // Dapatkan nonce awal
  const initialNonce = await provider.getTransactionCount(deployer.address);
  console.log("Initial nonce:", initialNonce);

  if (initialNonce !== 0) {
    console.log("\n⚠️  Nonce bukan 0! Lakukan:");
    console.log("1. Hentikan node (Ctrl+C)");
    console.log("2. rm -rf ~/.hardhat/");
    console.log("3. rm -rf node_modules/");
    console.log("4. npx hardhat clean/");
    console.log("5. npm install\n");
    process.exit(1);
  }

  // Deploy kontrak
  const Fermentation = await ethers.getContractFactory("Fermentation");
  const fermentation = await Fermentation.deploy();
  
  console.log("\n=== Deployment Result ===");
  console.log("Transaction hash:", fermentation.deploymentTransaction().hash);
  console.log("Contract address:", fermentation.target);
  console.log("Expected address:", "0x5FbDB2315678afecb367f032d93F642f64180aa3");
  console.log("=========================");

  // Verifikasi bytecode
  const deployedBytecode = await provider.getCode(fermentation.target);
  console.log("Bytecode length:", deployedBytecode.length);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n⚠️  Deployment error:", error.message);
    process.exit(1);
  });