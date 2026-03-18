<div align="center">
<img src="backend/assets/plicko.svg">

### Because 10 megabytes were never enough
[Plicko Demo.webm](https://github.com/user-attachments/assets/2009f721-8036-4ab1-8f5b-79764d1226f0)
</div>

Plicko lets you easily upload your files from discord up into your own cloud. There is no more need to go onto an online drive service just because Discord limits you to 8 megabytes without nitro.

> [!WARNING]
> This is a project made for myself and I don't expect anyone else to use it. Although if you have any questions, please feel free to reach out.

# Uploading a file
Currently, plicko supports three ways to upload a file conveniently from the discord app:
- "+" button in the message bar
- Right-clicking on the message bar
- Drap-and-drop (although not sure how long this will work before an update breaks it)

# License
This project is licensed under the GPLv3.
> This program is distributed in the hope that it will be useful,
>  but WITHOUT ANY WARRANTY; without even the implied warranty of
>  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
>  GNU General Public License for more details.

# Tech stack
### General:
 - Command runner / macros: [Just](https://github.com/casey/just)
 
### Vencord Extension
- Language: [TypeScript](https://www.typescriptlang.org/)
- Package manager: [PNPM](https://pnpm.io/)

### Backend
- Language: [Go](https://go.dev)
- Database: [PostgreSQL](https://www.postgresql.org/) (used for file metadata; not storing the actual contents)
- File storage: Filesystem (although S3 bucket support could become a thing someday)
- Containerization: [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
- Reverse proxy: [Traefik](https://traefik.io/traefik) (you must install manually; the docker compose configuration just expects it to be there)
