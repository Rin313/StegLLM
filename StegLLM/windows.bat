set "gguf="
for %%a in (data\*.gguf) do (
  if not defined gguf (
    set "gguf=%%a"
  )
)
if defined gguf (
start "" /high /b data\llamafile-0.9.2 --server -spf system_prompt.json --port 8090 --nologo  --path data/dist -m "%gguf%" -c 8192 --no-mmap  --log-disable  --nocompile --unsecure
)