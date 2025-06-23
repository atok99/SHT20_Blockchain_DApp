// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract Fermentation {
    struct SensorData {
        string sensorId;
        string location;
        string processStage;
        uint256 timestamp;
        int256 temperature; // in celsius * 10 to avoid floating point (27.5°C = 275)
        uint256 humidity;   // in percent * 10 (65.2% = 652)
    }

    SensorData[] public sensorReadings;
    address public owner;

    event NewReading(
        uint256 indexed id,
        string sensorId,
        string location,
        string processStage,
        uint256 timestamp,
        int256 temperature,
        uint256 humidity
    );

    constructor() {
        owner = msg.sender;
    }

    function addReading(
        string memory _sensorId,
        string memory _location,
        string memory _processStage,
        uint256 _timestamp,
        int256 _temperature,
        uint256 _humidity
    ) public {
        require(msg.sender == owner, "Only owner can add readings");
        
        sensorReadings.push(SensorData({
            sensorId: _sensorId,
            location: _location,
            processStage: _processStage,
            timestamp: _timestamp,
            temperature: _temperature,
            humidity: _humidity
        }));

        emit NewReading(
            sensorReadings.length - 1,
            _sensorId,
            _location,
            _processStage,
            _timestamp,
            _temperature,
            _humidity
        );
    }

    function getReadingCount() public view returns (uint256) {
        return sensorReadings.length;
    }
}