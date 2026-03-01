# Drive Compare

A simple folder tree comparison utility that supports local directories, archives, and network shares.

## Features

- Compare local directories
- Compare ZIP archives (using `unzip`)
- Compare 7Z archives (using `7z`)
- Compare SMB/CIFS network shares
- Recursive comparison with detailed reporting

## Usage

```bash
# Compare two local directories
drive-compare /path/to/folder1 /path/to/folder2

# Compare local directory with ZIP archive
drive-compare /path/to/folder archive.zip

# Compare two archives
drive-compare archive1.zip archive2.7z

# Compare SMB shares (requires smbclient)
drive-compare smb://server/share1 smb://server/share2

# Compare local directory with SMB share
drive-compare /local/path smb://server/share
```

## SMB Support

The tool supports SMB/CIFS network shares through SMB URLs in the format:
- `smb://server/share`
- `smb://server/share/subfolder`

### Requirements

For SMB support, you need `smbclient` installed on your system:

```bash
# Ubuntu/Debian
sudo apt-get install smbclient

# macOS (via Homebrew)
brew install samba

# CentOS/RHEL/Fedora
sudo yum install samba-client
# or
sudo dnf install samba-client
```

### SMB Usage Examples

```bash
# Compare two SMB shares
drive-compare smb://nas.local/Documents smb://backup.local/Documents

# Compare local backup with remote SMB share
drive-compare /local/backup smb://nas.local/Archive

# Compare SMB share with archive
drive-compare smb://server/share backup.zip
```

## Installation

```bash
npm install -g drive-compare
```

## Dependencies

- Node.js (ES modules support)
- Optional: `7z` for 7Z archive support
- Optional: `unzip` for ZIP archive support  
- Optional: `smbclient` for SMB/CIFS network share support

## Output

The tool will report:
- Files/folders that exist only in the first location
- Files/folders that exist only in the second location
- Summary of differences found

## Error Handling

If smbclient is not available when trying to access SMB shares, the tool will provide helpful error messages indicating that smbclient needs to be installed.
