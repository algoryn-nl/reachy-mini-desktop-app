/// USB Device Monitor - Event-driven USB detection for Windows
/// 
/// This module provides event-driven USB device detection using Windows WM_DEVICECHANGE messages.
/// This completely eliminates the need for polling, preventing terminal flicker issues on Windows.

#[cfg(target_os = "windows")]
use windows::{
    core::*,
    Win32::Foundation::*,
    Win32::System::LibraryLoader::GetModuleHandleW,
    Win32::UI::WindowsAndMessaging::*,
};

/// Shared state for USB device monitoring
pub struct UsbMonitorState {
    /// Current Reachy Mini port (VID:PID = 1a86:55d3)
    pub reachy_port: Option<String>,
    /// All available serial ports with their info
    pub available_ports: Vec<serialport::SerialPortInfo>,
}

impl UsbMonitorState {
    pub fn new() -> Self {
        UsbMonitorState {
            reachy_port: None,
            available_ports: Vec::new(),
        }
    }

    /// Update the list of available ports and find Reachy Mini
    pub fn update(&mut self) {
        match serialport::available_ports() {
            Ok(ports) => {
                self.available_ports = ports.clone();
                
                // Find Reachy Mini port (VID:PID = 1a86:55d3 - CH340 USB-to-serial)
                self.reachy_port = ports.iter()
                    .find_map(|port| {
                        if let serialport::SerialPortType::UsbPort(usb_info) = &port.port_type {
                            if usb_info.vid == 0x1a86 && usb_info.pid == 0x55d3 {
                                return Some(port.port_name.clone());
                            }
                        }
                        None
                    });
            }
            Err(e) => {
                eprintln!("[USB Monitor] Failed to enumerate ports: {}", e);
            }
        }
    }
}

#[cfg(target_os = "windows")]
pub type UsbMonitorStateArc = Arc<Mutex<UsbMonitorState>>;

#[cfg(target_os = "windows")]
lazy_static::lazy_static! {
    /// Global USB monitor state
    static ref USB_MONITOR: UsbMonitorStateArc = Arc::new(Mutex::new(UsbMonitorState::new()));
}

/// Get the current Reachy Mini port from the monitor
pub fn get_reachy_port() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        USB_MONITOR.lock().ok()?.reachy_port.clone()
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        // Fallback to direct check on non-Windows platforms
        match serialport::available_ports() {
            Ok(ports) => {
                ports.iter().find_map(|port| {
                    if let serialport::SerialPortType::UsbPort(usb_info) = &port.port_type {
                        if usb_info.vid == 0x1a86 && usb_info.pid == 0x55d3 {
                            return Some(port.port_name.clone());
                        }
                    }
                    None
                })
            }
            Err(_) => None
        }
    }
}

/// Force an immediate update of the USB device list
pub fn force_update() {
    #[cfg(target_os = "windows")]
    {
        if let Ok(mut state) = USB_MONITOR.lock() {
            state.update();
        }
    }
}

#[cfg(target_os = "windows")]
/// Window procedure for handling device change messages
extern "system" fn wnd_proc(hwnd: HWND, msg: u32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    match msg {
        WM_DEVICECHANGE => {
            const DBT_DEVICEARRIVAL: u32 = 0x8000;
            const DBT_DEVICEREMOVECOMPLETE: u32 = 0x8004;
            
            let event = wparam.0 as u32;
            
            // Update port list on device arrival or removal
            if event == DBT_DEVICEARRIVAL || event == DBT_DEVICEREMOVECOMPLETE {
                // Device change detected - update port list
                // We update on all device changes since serial port events may not always have detailed type info
                if let Ok(mut state) = USB_MONITOR.lock() {
                    state.update();
                }
            }
            
            LRESULT(0)
        }
        WM_DESTROY => {
            unsafe { PostQuitMessage(0) };
            LRESULT(0)
        }
        _ => unsafe { DefWindowProcW(hwnd, msg, wparam, lparam) },
    }
}

#[cfg(target_os = "windows")]
/// Start the USB device monitor in a background thread
/// This creates a hidden message-only window to receive WM_DEVICECHANGE messages
pub fn start_monitor() -> std::result::Result<(), String> {
    std::thread::spawn(|| {
        unsafe {
            let result: windows::core::Result<()> = (|| {
                // Get module handle
                let h_instance = GetModuleHandleW(None).map_err(|e| {
                    eprintln!("[USB Monitor] Failed to get module handle: {}", e);
                    e
                })?;

                // Register window class
                let class_name = w!("ReachyUsbMonitorWindow");
                let wnd_class = WNDCLASSEXW {
                    cbSize: std::mem::size_of::<WNDCLASSEXW>() as u32,
                    lpfnWndProc: Some(wnd_proc),
                    hInstance: h_instance.into(),
                    lpszClassName: class_name,
                    ..Default::default()
                };

                let atom = RegisterClassExW(&wnd_class);
                if atom == 0 {
                    return Err(Error::from_win32());
                }

                // Create message-only window (HWND_MESSAGE parent makes it invisible)
                let hwnd = CreateWindowExW(
                    WINDOW_EX_STYLE(0),
                    class_name,
                    w!("Reachy USB Monitor"),
                    WINDOW_STYLE(0),
                    0, 0, 0, 0,
                    HWND_MESSAGE, // Message-only window (completely invisible)
                    None,
                    h_instance,
                    None,
                );

                if hwnd.0 == 0 {
                    return Err(Error::from_win32());
                }

                // Register for device notifications (all device interfaces)
                let mut filter = DEV_BROADCAST_DEVICEINTERFACE_W {
                    dbcc_size: std::mem::size_of::<DEV_BROADCAST_DEVICEINTERFACE_W>() as u32,
                    dbcc_devicetype: DBT_DEVTYP_DEVICEINTERFACE,
                    dbcc_reserved: 0,
                    dbcc_classguid: Default::default(), // All device interfaces
                    dbcc_name: [0; 1],
                };

                let hdevnotify = RegisterDeviceNotificationW(
                    HANDLE(hwnd.0),
                    &mut filter as *mut _ as *mut _,
                    DEVICE_NOTIFY_WINDOW_HANDLE,
                )?;

                println!("[USB Monitor] Event-driven monitor started successfully");

                // Do an initial scan
                if let Ok(mut state) = USB_MONITOR.lock() {
                    state.update();
                    if let Some(port) = &state.reachy_port {
                        println!("[USB Monitor] Reachy Mini detected at: {}", port);
                    }
                }

                // Message loop
                let mut msg = MSG::default();
                while GetMessageW(&mut msg, None, 0, 0).into() {
                    TranslateMessage(&msg);
                    DispatchMessageW(&msg);
                }

                // Cleanup
                let _ = UnregisterDeviceNotification(hdevnotify);

                Ok(())
            })();

            if let Err(e) = result {
                eprintln!("[USB Monitor] Failed to start monitor: {}", e);
            }
        }
    });

    Ok(())
}

#[cfg(not(target_os = "windows"))]
/// Dummy function for non-Windows platforms
pub fn start_monitor() -> Result<(), String> {
    println!("[USB Monitor] Event-driven monitoring not available on this platform, using direct checks");
    Ok(())
}
