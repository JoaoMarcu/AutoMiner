# AutoMiner

AutoMiner é um mod Fabric para Minecraft Java Edition 1.21.1, acompanhado por um Manager desktop para instalação, configuração e diagnóstico local.

## Requisitos

- Minecraft Java Edition 1.21.1
- Fabric Loader compatível com 1.21.1
- Windows 10 ou superior para o AutoMiner Manager

## Downloads

Os arquivos oficiais estarão disponíveis na página de releases do GitHub:

- [Baixar AutoMiner Manager para Windows](https://github.com/JoaoMarcu/AutoMiner/releases/latest/download/AutoMiner-Setup.exe)
- [Baixar mod AutoMiner 1.0.4](https://github.com/JoaoMarcu/AutoMiner/releases/latest/download/autominer-1.0.4.jar)
- [Baixar checksums SHA-256](https://github.com/JoaoMarcu/AutoMiner/releases/latest/download/SHA256SUMS.txt)
- [Abrir todas as releases](https://github.com/JoaoMarcu/AutoMiner/releases)

## Instalação

Baixe o [AutoMiner Manager para Windows](https://github.com/JoaoMarcu/AutoMiner/releases/latest/download/AutoMiner-Setup.exe) e execute o instalador. Ele não exige Node.js, Rust, Cargo ou Gradle. Selecione qualquer instalação ou instância válida do Minecraft 1.21.1; o Manager identifica os arquivos sem depender do nome da pasta e instala somente o AutoMiner na pasta `mods` correta. O Fabric Loader e o Fabric API devem ser instalados pelo usuário.

Também é possível baixar o [JAR do AutoMiner](https://github.com/JoaoMarcu/AutoMiner/releases/latest/download/autominer-1.0.4.jar) e colocá-lo na pasta `mods` de uma instalação Fabric 1.21.1.

## Uso e configuração

Abra o Manager para verificar a instalação e configurar o comportamento de mineração. O mod fornece telemetria ao Manager enquanto o Minecraft estiver em execução; sem conexão, o aplicativo mostra os dados como indisponíveis em vez de estimá-los.

## Verificação dos downloads

Cada release publica checksums SHA-256. Em Linux/macOS, use `sha256sum --check SHA256SUMS.txt`; no Windows, compare o valor de `Get-FileHash -Algorithm SHA256 <arquivo>` com o arquivo de checksum.

## Build

O mod é compilado com Java 21 e Gradle Wrapper. O Manager é compilado com Next.js e Tauri. A release oficial é produzida pelo GitHub Actions ao publicar uma tag `v*`; o pipeline valida o JAR, o instalador, os checksums e o manifest antes de publicar.

## Servidores e responsabilidade

Verifique as regras do servidor antes de usar automação. O usuário é responsável por respeitar os termos do servidor e do Minecraft. AutoMiner não é afiliado à Mojang Studios ou Microsoft.

## Publicação v1.0.4

A tag `v1.0.4` dispara `.github/workflows/release.yml` e publica automaticamente os artefatos após os builds passarem. A release será criada em [Releases](https://github.com/JoaoMarcu/AutoMiner/releases).

## Licença

MIT. Consulte `LICENSE`.
