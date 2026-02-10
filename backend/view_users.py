import sqlite3
import os

# Find the database file
db_path = 'neuroassist.db'
if not os.path.exists(db_path):
    # Try the path relative to the script
    db_path = os.path.join(os.path.dirname(__file__), 'neuroassist.db')

if not os.path.exists(db_path):
    print(f"❌ Database not found at {db_path}")
    exit()

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Query all users
    cursor.execute("SELECT id, username FROM users")
    users = cursor.fetchall()
    
    print("\n" + "="*40)
    print(f"👥 REGISTERED USERS ({len(users)})")
    print("="*40)
    print(f"{'ID':<5} | {'Username':<30}")
    print("-"*40)
    
    for user in users:
        print(f"{user[0]:<5} | {user[1]:<30}")
    
    print("="*40 + "\n")
    
    conn.close()
except Exception as e:
    print(f"❌ Error reading database: {e}")
