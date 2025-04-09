set "gguf="
for %%a in (data\*.gguf) do (
  if not defined gguf (
    set "gguf=%%a"
  )
)
if defined gguf (
start "" /high /b data\llamafile-0.9.2 --server -spf system_prompt.json --host 127.0.0.1 --port 8090 --timeout 2 --path data/dist -m "%gguf%" -c 8192 --no-mmap  --log-disable  --nocompile --unsecure
)