import socket
try:
    ip = socket.gethostbyname('autoassis-jcesarsantana215-a0a8.f.aivencloud.com')
    print(f"OK: {ip}")
except Exception as e:
    print(f"FAIL: {e}")
