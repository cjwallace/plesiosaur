@list:
    just --list

build:
    deno compile --allow-read --allow-write main.ts -o plesiosaur

echo: build
    ./maelstrom/maelstrom test -w echo --bin ./plesiosaur --time-limit 5

generate: build
    ./maelstrom/maelstrom test -w unique-ids --bin ./plesiosaur --time-limit 30 --rate 1000 --node-count 3 --availability total --nemesis partition

single-node-broadcast: build
    ./maelstrom/maelstrom test -w broadcast --bin ./plesiosaur --node-count 1 --time-limit 20 --rate 10

multi-node-broadcast: build
    ./maelstrom/maelstrom test -w broadcast --bin ./plesiosaur --node-count 5 --time-limit 30 --rate 10

all:
    @echo "Building plesiosaur binary"
    @just build 2>/dev/null
    @echo "Running maelstrom echo test"
    @just echo 2>/dev/null | tail -n 1
    @echo "Running maelstrom unique ID generation test"
    @just generate 2>/dev/null | tail -n 1
    @echo "Running maelstrom broadcast test"
    @just multi-node-broadcast 2>/dev/null | tail -n 1
