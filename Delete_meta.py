import os
import tkinter as tk
from tkinter import filedialog

root = tk.Tk()
root.withdraw()

folder = filedialog.askdirectory(title="Select folder to clean .meta files")
if not folder:
    print("No folder selected.")
    exit()

count = 0
for dirpath, dirnames, filenames in os.walk(folder):
    for f in filenames:
        if f.endswith(".meta"):
            path = os.path.join(dirpath, f)
            os.remove(path)
            print(f"Deleted: {path}")
            count += 1

print(f"\nDone. Deleted {count} .meta file(s).")