<div align="center">
  <img src="assets/screenshot.png" alt="Google Tasks for Gnome Screenshot">
</div>

# Google Tasks for Gnome

![Gnome Extensions Downloads](https://img.shields.io/gnome-extensions/dt/googletasks%40ztluwu.dev?color=57a8ff) ![GitHub Release](https://img.shields.io/github/v/release/ZTL-UwU/gnome-shell-google-tasks?color=52d794)

A Gnome shell extension to manage your [Google Tasks](https://tasks.google.com) directly from a notification panel widget. _This extension is not affiliated, funded, or in any way associated with Google._

## Installation

### Dependencies

- Debian-based: `sudo apt install gir1.2-goa-1.0`
- openSUSE: `sudo zypper install typelib-1_0-Goa-1_0`
- Arch-based: works out of the box

[<img width="200" src="https://github.com/andyholmes/gnome-shell-extensions-badge/raw/master/get-it-on-ego.png" alt="Get it on GNOME Extensions">](https://extensions.gnome.org/extension/9322/google-tasks/)

## Usage

1. Log in to Gnome Online Accounts with your Google account **(Settings > Online Accounts)**. Make sure "Tasks" is enabled in the OAuth permissions.
2. Open the notification panel by clicking on the clock in the top bar or pressing `Super + V`.

## Development & deploy

### Prerequisites

- [Bun](https://bun.sh) — used for dependencies and builds (the `Makefile` runs `bun install` / `bun run build`)

### Setup & build

```sh
git clone https://github.com/ZTL-UwU/gnome-shell-google-tasks.git
cd gnome-shell-google-tasks
bun install       # optional; `make` will install if needed
make              # compiles TypeScript and copies assets into dist/
```

- `bun run build` — compile TypeScript to `dist/`
- `bun run lint` — lint source; `make pack`/`make install` also run ESLint against `dist/` (`lint-dist`)

### Local install & testing

```sh
make install      # builds, packs googletasks@ztluwu.dev.zip, installs with gnome-extensions
```

Restart the shell (**Alt+F2**, type `restart`, Enter) so changes load. Use **Extensions** to enable or disable `Google Tasks`.

### Packaging for release

```sh
make clean && make pack
```

This produces `googletasks@ztluwu.dev.zip` in the project root — upload this to [extensions.gnome.org](https://extensions.gnome.org) or distribute manually.

### Clean build artifacts

```sh
make clean        # removes dist/, node_modules/, and the zip
```

## License

[MIT](https://github.com/ZTL-UwU/gnome-shell-google-tasks/blob/main/LICENSE)

---

<a href='https://ko-fi.com/T6T7R1M58' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi3.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
