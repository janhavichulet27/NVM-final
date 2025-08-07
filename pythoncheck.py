import os

# Folder path to your stock files
data_dir = r"C:\Users\Administrator\Desktop\data\Stocks"

# Top 10 US tickers to test
top10_tickers = [
    "AAPL",
    "MSFT",
    "AMZN",
    "GOOGL",
    "GOOG",
    "META",
    "NVDA",
    "TSLA",
    "BRK-B",
    "JPM"
]

def print_first_two_lines(file_path):
    try:
        with open(file_path, 'r') as f:
            # Read and print first 2 lines
            for i in range(2):
                line = f.readline()
                if line == '':
                    # Less than 2 lines available
                    break
                print(f"Line {i+1}: {line.strip()}")
    except Exception as e:
        print(f"Error reading {file_path}: {e}")

def main():
    files = os.listdir(data_dir)
    files_lower = [f.lower() for f in files]

    for ticker in top10_tickers:
        # Build expected filename in lowercase for matching
        expected_filename_lower = f"{ticker.lower()}.us"
        if expected_filename_lower in files_lower:
            idx = files_lower.index(expected_filename_lower)
            file_path = os.path.join(data_dir, files[idx])
            print(f"\nOpening file for ticker {ticker}: {files[idx]}")
            print_first_two_lines(file_path)
        else:
            print(f"\nFile not found for ticker {ticker} (expected as {expected_filename_lower})")

if __name__ == "__main__":
    main()
