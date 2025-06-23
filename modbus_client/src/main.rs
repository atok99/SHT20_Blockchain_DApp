use chrono::{Local, SecondsFormat};
use tokio_modbus::{client::rtu, prelude::*};
use tokio_serial::SerialStream;
use tokio::{
    net::TcpStream,
    time::{sleep, Duration, timeout, Instant},
    io::{AsyncReadExt, AsyncWriteExt},
};
use serde_json::json;
use std::error::Error;

// Konfigurasi
const SERIAL_PORT: &str = "/dev/ttyUSB0";
const SERIAL_BAUD: u32 = 9600;
const SERIAL_TIMEOUT: Duration = Duration::from_secs(3);
const SENSOR_SLAVE_ADDR: u8 = 1;
const TCP_SERVER: &str = "127.0.0.1:7878";
const TCP_TIMEOUT: Duration = Duration::from_secs(5);
const SEND_INTERVAL: Duration = Duration::from_secs(10);
const MAX_RETRIES: u32 = 3;

async fn read_sensor_data() -> Result<Vec<u16>, Box<dyn Error>> {
    let port_config = tokio_serial::new(SERIAL_PORT, SERIAL_BAUD)
        .parity(tokio_serial::Parity::None)
        .stop_bits(tokio_serial::StopBits::One)
        .data_bits(tokio_serial::DataBits::Eight)
        .timeout(SERIAL_TIMEOUT);
    
    let port = SerialStream::open(&port_config)?;
    let slave = Slave(SENSOR_SLAVE_ADDR);
    
    let mut ctx = rtu::attach_slave(port, slave);
    let response = timeout(SERIAL_TIMEOUT, ctx.read_input_registers(1, 2)).await??;
    
    Ok(response)
}

async fn send_to_server(
    sensor_id: &str,
    location: &str,
    process_stage: &str,
    temperature: f32,
    humidity: f32,
    timestamp: chrono::DateTime<Local>,
) -> Result<(), Box<dyn Error>> {
    let payload = json!({
        "timestamp": timestamp.to_rfc3339_opts(SecondsFormat::Secs, true),
        "sensor_id": sensor_id,
        "location": location,
        "process_stage": process_stage,
        "temperature_celsius": temperature,
        "humidity_percent": humidity
    });

    let json_str = payload.to_string();
    println!("[{}] Sending data: {}", timestamp.format("%Y-%m-%d %H:%M:%S"), json_str);
    
    let mut stream = timeout(TCP_TIMEOUT, TcpStream::connect(TCP_SERVER)).await??;
    timeout(TCP_TIMEOUT, stream.write_all(json_str.as_bytes())).await??;
    
    let mut buf = [0; 1024];
    let n = timeout(TCP_TIMEOUT, stream.read(&mut buf)).await??;
    println!("[{}] Server response: {}", 
        Local::now().format("%Y-%m-%d %H:%M:%S"), 
        std::str::from_utf8(&buf[..n])?);
    
    Ok(())
}

async fn read_and_send_data() -> Result<(), Box<dyn Error>> {
    let sensor_id = "SHT20-001";
    let location = "Crude Oil Storage Tank T-101";
    let process_stage = "Storage";
    let timestamp = Local::now();
    let start_time = Instant::now();

    // Baca data sensor
    let sensor_data = {
        let mut retries = 0;
        let mut last_error = None;
        
        loop {
            match timeout(SERIAL_TIMEOUT, read_sensor_data()).await {
                Ok(Ok(data)) if data.len() == 2 => break Ok(data),
                Ok(Ok(invalid)) => {
                    last_error = Some(format!("Invalid sensor response: {:?}", invalid));
                }
                Ok(Err(e)) => {
                    last_error = Some(format!("Sensor read error: {}", e));
                }
                Err(_) => {
                    last_error = Some("Sensor read timed out".to_string());
                }
            }
            
            retries += 1;
            if retries >= MAX_RETRIES {
                break Err(last_error.unwrap_or_else(|| "Unknown error".to_string()));
            }
            
            sleep(Duration::from_secs(1)).await;
        }
    };

    // Proses data sensor
    let (temperature, humidity) = match sensor_data {
        Ok(data) => (data[0] as f32 / 10.0, data[1] as f32 / 10.0),
        Err(e) => {
            eprintln!("[{}] Sensor error: {}", timestamp.format("%Y-%m-%d %H:%M:%S"), e);
            return Ok(());
        }
    };

    println!("[{}] {} - {}: Temp={:.1}°C, RH={:.1}%", 
        timestamp.format("%Y-%m-%d %H:%M:%S"),
        location, 
        process_stage,
        temperature,
        humidity);

    // Kirim data ke server
    let mut retries = 0;
    while retries < MAX_RETRIES {
        match timeout(TCP_TIMEOUT, send_to_server(
            sensor_id, 
            location, 
            process_stage, 
            temperature, 
            humidity,
            timestamp
        )).await {
            Ok(Ok(())) => break,
            Ok(Err(e)) => {
                eprintln!("[{}] Send error (attempt {}): {}", 
                    timestamp.format("%Y-%m-%d %H:%M:%S"), retries + 1, e);
            }
            Err(_) => {
                eprintln!("[{}] Send timeout (attempt {})", 
                    timestamp.format("%Y-%m-%d %H:%M:%S"), retries + 1);
            }
        }
        
        retries += 1;
        if retries < MAX_RETRIES {
            sleep(Duration::from_secs(1)).await;
        }
    }

    // Pertahankan interval 10 detik
    let elapsed = start_time.elapsed();
    if elapsed < SEND_INTERVAL {
        sleep(SEND_INTERVAL - elapsed).await;
    }

    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    println!("Starting SHT20 sensor monitoring...");

    loop {
        if let Err(e) = read_and_send_data().await {
            eprintln!("[{}] Main loop error: {}", 
                Local::now().format("%Y-%m-%d %H:%M:%S"), e);
            sleep(Duration::from_secs(5)).await;
        }
    }
}