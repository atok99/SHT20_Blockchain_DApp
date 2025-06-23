# 🌡️ SHT20 Blockchain DApp - Industrial Crude Oil Monitoring with Web3

![alt text](https://github.com/atok99/SHT20_Blockchain_DApp/blob/main/TampilanDApp1.png?raw=true)

---

**SHT20_Blockchain_DApp** adalah proyek sistem monitoring suhu dan kelembaban berbasis sensor industri SHT20 (Modbus RTU) yang terintegrasi dengan blockchain untuk transparansi dan keamanan data. Proyek ini cocok untuk lingkungan industri seperti **Crude Oil Tank Monitoring** atau **data center**, yang membutuhkan pencatatan data real-time dan tidak dapat dimanipulasi.

## 👨‍💻 Author

## 📌 Fitur Utama

- Membaca data suhu dan kelembaban dari sensor SHT20 via Modbus RTU.
- Mengirim data ke TCP Server menggunakan format JSON.
- Menyimpan data secara real-time ke database time-series **InfluxDB**.
- Visualisasi data menggunakan **Grafana**.
- Mengintegrasikan data ke dalam jaringan **Ethereum (via Hardhat)** untuk transparansi.
- DApp sederhana untuk melihat riwayat data di blockchain.

## 🛠️ Teknologi yang Digunakan

| Layer | Teknologi |
|-------|-----------|
| Hardware | Sensor SHT20 (RS485 to USB) |
| Backend | [Rust](https://www.rust-lang.org/), Modbus RTU, TCP Server |
| Blockchain | Solidity, Hardhat, Ethers.js, Ganache/Hardhat Node |
| Database | InfluxDB |
| Visualisasi | Grafana |
| Frontend DApp | React.js, Ethers.js, Web3 |
| Tools | Node.js, npm, VSCode, Ubuntu 22.04 |

## 🧱 Struktur Direktori

```bash
SHT20_Blockchain_DApp/
├── blockchain/           # Smart Contract & Hardhat Project
├── dapp/                 # React.js DApp Frontend
├── tcp_server/           # TCP Server Rust (Modbus RTU reader)
├── influxdb/             # Setup InfluxDB (opsional)
└── README.md
```

## ⚙️ Cara Instalasi

### 1. Clone Repository

```bash
git clone https://github.com/atok99/SHT20_Blockchain_DApp.git
cd SHT20_Blockchain_DApp
```

### 2. Setup Blockchain (Hardhat)

```bash
cd blockchain
npm install
npx hardhat compile
npx hardhat node
# Open another terminal
npx hardhat run scripts/deploy.js --network localhost
```

### 3. Jalankan TCP Server (Rust)

```bash
cd tcp_server
cargo build --release
./target/release/tcp_server
```

Pastikan Anda sudah mengatur port serial dengan benar (`/dev/ttyUSB0`) dan sensor SHT20 terhubung.

### 4. Jalankan DApp Frontend

```bash
cd dapp
npm install
npm start
```

Frontend akan berjalan di `http://localhost:3000` dan terhubung dengan blockchain lokal (localhost:8545).

## 📡 Alur Sistem

1. **Sensor SHT20** mengirimkan data suhu dan kelembaban via RS485.
2. **TCP Server Rust** membaca data dan mengirim ke **InfluxDB** & **Smart Contract** Ethereum.
3. Data divisualisasikan melalui **Grafana** dan **DApp** berbasis React.

## 🔐 Tentang Blockchain & Web3

- **Blockchain**: Digunakan untuk menyimpan data lingkungan yang transparan, permanen, dan tidak dapat diubah.
- **Smart Contract**: Ditulis dengan Solidity, menyimpan data suhu, kelembaban, waktu, dan sensor ID.
- **DApp (Decentralized App)**: Aplikasi web React yang membaca data dari blockchain menggunakan Ethers.js.

## 🧪 Contoh Data JSON (dari TCP Server)

```json
{
  "sensor_id": "SHT20_001",
  "temperature": 28.5,
  "humidity": 65.2,
  "timestamp": "2025-06-23T08:00:00Z"
}
```

## 📷 Screenshot

*Tambahkan di sini tangkapan layar (opsional) dari DApp, Grafana, atau terminal TCP server*

## 💡 Catatan

- Diuji pada Ubuntu 22.04.
- Anda memerlukan sensor SHT20 dan konverter RS485-USB untuk membaca data nyata.
- DApp saat ini masih dalam tahap pengembangan awal dan dapat diperluas dengan IPFS, Metamask, dll.

## 📄 Lisensi

Proyek ini berlisensi di bawah MIT License.

## 🤝 Kontribusi

Pull request terbuka. Untuk perubahan besar, harap buka issue terlebih dahulu untuk mendiskusikan perubahan yang ingin Anda buat.

