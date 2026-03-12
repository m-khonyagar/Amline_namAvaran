from pathlib import Path

def main():
    msg = 'hello from taskflow stub'
    print(msg)
    Path('output.txt').write_text(msg + '\n', encoding='utf-8')

if __name__ == '__main__':
    main()
