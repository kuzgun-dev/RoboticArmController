import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

export default function App() {
  const [device, setDevice] = useState(null);
  const [scannedDevices, setScannedDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [logs, setLogs] = useState([]);
  const [selection, setSelection] = useState('');
  const [tempData, setTempData] = useState('--');
  const [fanState, setFanState] = useState('UNKNOWN');

  const scrollRef = useRef();

  // Helper to add logs
  const addLog = (msg) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${msg}`, ...prev]);
  };

  useEffect(() => {
    requestPermissions();
    
    // Cleanup on unmount
    return () => {
      if (device) {
        device.disconnect();
      }
    };
  }, []);

  // Listen for incoming data when connected
  useEffect(() => {
    let subscription;
    if (device) {
      subscription = device.onDataReceived((data) => {
        const message = data.data.trim();
        addLog(`RX: ${message}`);
        
        // Simple parsing based on ESP32 responses
        if (message.includes("Sicaklik")) {
            // Format: "Sicaklik: 25.00C | Fan: KAPALI"
            setTempData(message);
        } else if (message.includes("FAN: ACIK") || message.includes("Fanlar acildi")) {
            setFanState('ON');
        } else if (message.includes("FAN: KAPALI") || message.includes("Fanlar kapatildi")) {
            setFanState('OFF');
        }
      });
    }
    return () => {
      if (subscription) subscription.remove();
    };
  }, [device]);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        // Android 12+ permissions
        if (Platform.Version >= 31) {
          const result = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]);
          
          if (
            result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
            result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED
          ) {
            addLog("Permissions granted");
          } else {
            addLog("Permissions denied");
            Alert.alert("Permission Error", "Bluetooth permissions are required.");
          }
        } else {
          // Android < 12 permissions
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            addLog("Location permission granted");
          } else {
            addLog("Location permission denied");
          }
        }
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const scanForDevices = async () => {
    setScannedDevices([]);
    setIsScanning(true);
    addLog("Scanning...");
    try {
      const devices = await RNBluetoothClassic.startDiscovery();
      const sorted = devices.sort((a, b) => (b.rssi || 0) - (a.rssi || 0)); // Sort by signal strength if available
      setScannedDevices(sorted);
      addLog(`Found ${devices.length} devices`);
    } catch (err) {
      addLog(`Scan Error: ${err.message}`);
      Alert.alert("Error", "Could not scan for devices.");
    } finally {
      setIsScanning(false);
    }
  };

  const connectToDevice = async (selectedDevice) => {
    try {
      setConnectionStatus('Connecting...');
      addLog(`Connecting to ${selectedDevice.name}...`);
      const connected = await selectedDevice.connect();
      if (connected) {
        setDevice(selectedDevice);
        setConnectionStatus('Connected');
        addLog(`Connected to ${selectedDevice.name}`);
        setSelection(''); // Reset selection
      } else {
        setConnectionStatus('Disconnected');
        addLog("Connection failed");
      }
    } catch (err) {
      setConnectionStatus('Disconnected');
      addLog(`Connection Error: ${err.message}`);
    }
  };

  const disconnect = async () => {
    if (device) {
      await device.disconnect();
      setDevice(null);
      setConnectionStatus('Disconnected');
      addLog("Disconnected");
    }
  };

  const sendCommand = async (cmd) => {
    if (!device) return;
    try {
      await device.write(cmd); 
      addLog(`TX: ${cmd}`);
    } catch (err) {
      addLog(`Send Error: ${err.message}`);
    }
  };

  const handleLetterPress = (letter) => {
    const newSelection = selection + letter;
    setSelection(newSelection);

    if (newSelection.length === 2) {
      sendCommand(newSelection);
      setTimeout(() => setSelection(''), 500); // Clear after brief delay
    }
  };

  const renderDeviceItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.deviceItem} 
      onPress={() => connectToDevice(item)}
    >
      <Text style={styles.deviceName}>{item.name || item.address}</Text>
      <Text style={styles.deviceAddress}>{item.address}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Robotic Arm Controller</Text>
          <Text style={styles.statusText}>Status: {connectionStatus}</Text>
        </View>

        {!device ? (
          <View style={styles.scanSection}>
            <TouchableOpacity 
              style={[styles.button, styles.scanButton]} 
              onPress={scanForDevices} 
              disabled={isScanning}
            >
              {isScanning ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Scan for Devices</Text>}
            </TouchableOpacity>
            
            <FlatList
              data={scannedDevices}
              keyExtractor={(item) => item.address}
              renderItem={renderDeviceItem}
              ListEmptyComponent={<Text style={styles.emptyText}>No devices found</Text>}
              style={styles.deviceList}
            />
          </View>
        ) : (
          <ScrollView style={styles.controlSection}>
            <TouchableOpacity style={styles.disconnectButton} onPress={disconnect}>
              <Text style={styles.disconnectButtonText}>Disconnect</Text>
            </TouchableOpacity>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Movement</Text>
              <View style={styles.selectionBox}>
                <Text style={styles.selectionText}>{selection || "Select 2 Letters"}</Text>
              </View>
              <View style={styles.grid}>
                {['A', 'B', 'C', 'D', 'E'].map((letter) => (
                  <TouchableOpacity
                    key={letter}
                    style={styles.letterButton}
                    onPress={() => handleLetterPress(letter)}
                    disabled={selection.length >= 2}
                  >
                    <Text style={styles.letterButtonText}>{letter}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.clearButton} onPress={() => setSelection('')}>
                <Text style={styles.clearButtonText}>Clear Selection</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Environment</Text>
              <View style={styles.row}>
                <TouchableOpacity style={styles.actionButton} onPress={() => sendCommand('TEMP')}>
                  <Text style={styles.actionButtonText}>GET TEMP</Text>
                </TouchableOpacity>
                <View style={styles.infoBox}>
                   <Text style={styles.infoText}>{tempData}</Text>
                </View>
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Fan Control</Text>
              <View style={styles.row}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.onButton, fanState === 'ON' && styles.activeButton]} 
                  onPress={() => sendCommand('ON')}
                >
                  <Text style={styles.actionButtonText}>FAN ON</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.offButton, fanState === 'OFF' && styles.activeButton]} 
                  onPress={() => sendCommand('OFF')}
                >
                  <Text style={styles.actionButtonText}>FAN OFF</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}

        <View style={styles.logsContainer}>
          <Text style={styles.logsTitle}>Logs</Text>
          <ScrollView ref={scrollRef} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
            {logs.map((log, index) => (
              <Text key={index} style={styles.logText}>{log}</Text>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  header: {
    padding: 20,
    backgroundColor: '#2196F3',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusText: {
    color: '#e3f2fd',
    marginTop: 5,
  },
  scanSection: {
    flex: 1,
    padding: 20,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  scanButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deviceList: {
    flex: 1,
    marginTop: 10,
  },
  deviceItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  deviceAddress: {
    fontSize: 12,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
  },
  controlSection: {
    flex: 1,
    padding: 15,
  },
  disconnectButton: {
    backgroundColor: '#ff5252',
    padding: 10,
    borderRadius: 5,
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  disconnectButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  panel: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  selectionBox: {
    backgroundColor: '#e3f2fd',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  selectionText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1565C0',
    letterSpacing: 5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  letterButton: {
    width: 60,
    height: 60,
    backgroundColor: '#2196F3',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
  },
  letterButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  clearButton: {
    alignSelf: 'center',
    marginTop: 10,
  },
  clearButtonText: {
    color: '#757575',
    textDecorationLine: 'underline',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    backgroundColor: '#607D8B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  onButton: {
    backgroundColor: '#4CAF50',
  },
  offButton: {
    backgroundColor: '#F44336',
  },
  activeButton: {
    borderWidth: 3,
    borderColor: '#333',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  infoBox: {
    flex: 2,
    backgroundColor: '#fafafa',
    padding: 10,
    borderRadius: 5,
    marginLeft: 10,
  },
  infoText: {
    fontSize: 12,
    color: '#333',
  },
  logsContainer: {
    height: 150,
    backgroundColor: '#212121',
    padding: 10,
  },
  logsTitle: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 5,
  },
  logText: {
    color: '#00E676',
    fontSize: 10,
    fontFamily: 'monospace',
  },
});
