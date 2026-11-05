# Setting up HackQuest Prep on Kali Linux

Step-by-step guide for running this project on Kali Linux (Debian-based, tested approach on a recent rolling release).

## 1. Update the system

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential
```

## 2. Install Node.js 20+

Kali's packaged Node is often too old. Use `nvm`:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc        # use ~/.zshrc if you use zsh (Kali default)
nvm install 20
nvm use 20
node -v                 # should print v20.x
```

## 3. Get a MongoDB

Pick **one** option.

### Option A: Docker (recommended)

```bash
sudo apt install -y docker.io
sudo systemctl enable --now docker
sudo docker run -d --name hq-mongo -p 27017:27017 -v hq-data:/data/db mongo:7
```

URI: `mongodb://127.0.0.1:27017`

### Option B: MongoDB Atlas (free cloud)

Create a free cluster, add a least-privilege database user, allow your IP, and copy the connection string.

### Option C: No install (bundled dev database)

After step 4, run this in a separate terminal and leave it running:

```bash
npm run db:dev
```

Data is stored in `./.mongo-data`. The first run downloads the MongoDB binary (about 800 MB). It may not support the newest Kali release's libraries; if it fails, use Option A or B.

### Optional: MongoDB Compass on Kali

Download the `.deb` from <https://www.mongodb.com/try/download/compass>, then:

```bash
sudo apt install ./mongodb-compass_*_amd64.deb
```

Connect to your URI to browse the `hackquest_prep` database.

## 4. Clone and install the project

```bash
git clone https://github.com/Rahul-issar09/HackQuest.git
cd HackQuest
npm install
```

## 5. Configure environment

```bash
cp .env.example .env.local
nano .env.local
```

Set:

```
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=hackquest_prep
```

(Use your Atlas string instead if you chose Option B.) Never commit `.env.local`.

## 6. Run the app

```bash
npm run dev
```

Open <http://localhost:3000>. The first request seeds the roadmap, resources, challenges, note folders and mock sessions. To seed manually: `npm run seed`.

## 7. Verify

```bash
npm run typecheck
npm run lint
npm test
```

## Production mode (optional)

```bash
npm run build
npm start
```

## Troubleshooting

| Problem | Fix |
|---|---|
| `node: command not found` after nvm install | Open a new terminal or run `source ~/.zshrc` |
| `ECONNREFUSED 127.0.0.1:27017` | MongoDB is not running. `sudo docker start hq-mongo` or start `npm run db:dev` |
| `docker: permission denied` | Prefix with `sudo`, or `sudo usermod -aG docker $USER` and log back in |
| Port 3000 already in use | `PORT=3001 npm run dev` |
| Atlas auth/timeout errors | Check the user password (URL-encode special characters) and the IP allow list |
| `npm install` build errors | Make sure `build-essential` is installed and you are on Node 20+ |

## Security note

The app has no authentication. Keep it on localhost or a private network.
