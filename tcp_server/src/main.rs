use influxdb2::Client;
use influxdb2::models::DataPoint;
use serde::Deserialize;
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::TcpListener,
};
use futures::stream;
use chrono::{Utc, DateTime};
use web3::{
    contract::{Contract, Options},
    types::{H160, U256},
    transports::Http,
    Web3,
};
use std::str::FromStr;

#[derive(Debug, Deserialize)]
struct SensorData {
    timestamp: String,
    sensor_id: String,
    location: String,
    process_stage: String,
    temperature_celsius: f64,
    humidity_percent: f64,
}

async fn store_to_blockchain(data: &SensorData) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let timestamp = match DateTime::parse_from_rfc3339(&data.timestamp) {
        Ok(dt) => dt.timestamp() as u64,
        Err(_) => Utc::now().timestamp() as u64,
    };

    let transport = Http::new("http://localhost:8545")?;
    let web3 = Web3::new(transport);

    // Contoh alamat kontrak - ganti dengan yang sebenarnya
    let contract_addr = H160::from_str("0x5FbDB2315678afecb367f032d93F642f64180aa3")?;
    
    // ABI langsung dalam kode
    let contract_abi = r#"
        [
            {
                "inputs": [
                    {"internalType": "string", "name": "_sensorId", "type": "string"},
                    {"internalType": "string", "name": "_location", "type": "string"},
                    {"internalType": "string", "name": "_processStage", "type": "string"},
                    {"internalType": "uint256", "name": "_timestamp", "type": "uint256"},
                    {"internalType": "int256", "name": "_temperature", "type": "int256"},
                    {"internalType": "uint256", "name": "_humidity", "type": "uint256"}
                ],
                "name": "addReading",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }
        ]
    "#.as_bytes();
    
    let contract = Contract::from_json(web3.eth(), contract_addr, contract_abi)?;

    let temp_fixed = (data.temperature_celsius * 10.0).round() as i128;
    let hum_fixed = (data.humidity_percent * 10.0).round() as u64;

    let tx = contract.call(
        "addReading",
        (
            data.sensor_id.clone(),
            data.location.clone(),
            data.process_stage.clone(),
            timestamp,
            temp_fixed,
            U256::from(hum_fixed),
        ),
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266".parse()?,
        Options::default(),
    ).await?;

    println!("Transaction Hash: {:?}", tx);
    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let influx_url = "http://localhost:8086";
    let influx_org = "INSTITUT TEKNOLOGI SEPULUH NOPEMBER";
    let influx_token = "fXwgQMVodek-zcZDo-Q4W5RkEMMxs3yrNMFaX6hbpVyrHT_kQdpk8TF64ul97VtgU2Ji3BPNNoMMIi6pdaE1Yg==";
    let influx_bucket = "Tank T-101";

    let client = Client::new(influx_url, influx_org, influx_token);

    match client.health().await {
        Ok(health) => println!("InfluxDB connection healthy: {:?}", health),
        Err(e) => {
            eprintln!("Failed to connect to InfluxDB: {}", e);
            return Err(e.into());
        }
    }

    let listener = TcpListener::bind("127.0.0.1:7878").await?;
    println!("Server running on 127.0.0.1:7878");

    loop {
        let (mut socket, _) = listener.accept().await?;
        let client = client.clone();
        let bucket = influx_bucket.to_string();
        
        tokio::spawn(async move {
            let mut buf = [0; 1024];
            
            match socket.read(&mut buf).await {
                Ok(n) if n == 0 => return,
                Ok(n) => {
                    let data = match std::str::from_utf8(&buf[..n]) {
                        Ok(d) => d,
                        Err(e) => {
                            eprintln!("Error parsing data: {}", e);
                            let _ = socket.write_all(b"ERROR: Invalid UTF-8 data").await;
                            return;
                        }
                    };
                    
                    println!("Received raw data: {}", data);
                    
                    match serde_json::from_str::<SensorData>(data) {
                        Ok(sensor_data) => {
                            println!("Data received: {:?}", sensor_data);
                            
                            let timestamp = match DateTime::parse_from_rfc3339(&sensor_data.timestamp) {
                                Ok(dt) => dt.with_timezone(&Utc),
                                Err(e) => {
                                    eprintln!("Invalid timestamp format: {}", e);
                                    let _ = socket.write_all(b"ERROR: Invalid timestamp format").await;
                                    return;
                                }
                            };

                            let timestamp_ns = timestamp.timestamp_nanos_opt().unwrap_or(0);

                            let point = DataPoint::builder("environment_monitoring")
                                .tag("sensor_id", &sensor_data.sensor_id)
                                .tag("location", &sensor_data.location)
                                .tag("process_stage", &sensor_data.process_stage)
                                .field("temperature_celsius", sensor_data.temperature_celsius)
                                .field("humidity_percent", sensor_data.humidity_percent)
                                .timestamp(timestamp_ns)
                                .build()
                                .unwrap();
                            
                            match client.write(&bucket, stream::iter(vec![point])).await {
                                Ok(_) => {
                                    println!("Data successfully written to InfluxDB");
                                    
                                    // Tambahan: simpan data ke blockchain juga
                                    match store_to_blockchain(&sensor_data).await {
                                        Ok(_) => {
                                            println!("Data stored to blockchain successfully");
                                            let _ = socket.write_all(b"OK: Data stored to DB and Blockchain").await;
                                        },
                                        Err(e) => {
                                            eprintln!("Failed to store to blockchain: {}", e);
                                            let _ = socket.write_all(
                                                format!("WARNING: DB success but Blockchain failed - {}", e).as_bytes()
                                            ).await;
                                        }
                                    }
                                },
                                Err(e) => {
                                    eprintln!("Failed to write to InfluxDB: {}", e);
                                    let _ = socket.write_all(
                                        format!("ERROR: Database write failed - {}", e).as_bytes()
                                    ).await;
                                }
                            }
                        }
                        Err(e) => {
                            eprintln!("Error parsing JSON: {}", e);
                            let _ = socket.write_all(
                                format!("ERROR: Invalid JSON - {}", e).as_bytes()
                            ).await;
                        }
                    }
                }
                Err(e) => eprintln!("Error reading socket: {}", e),
            }
        });
    }
}
