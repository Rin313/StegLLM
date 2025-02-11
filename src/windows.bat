@echo off
start "" "data\StegLLM.html"

set "llamafile="
for %%a in (data\*.llamafile) do (
  if not defined llamafile (
    set "llamafile=%%a"
  )
)
if defined llamafile (
  start "" /high /b "%llamafile%" --server -spf system_prompt.txt --port 8090 --nobrowser --log-disable -c 0 --no-mmap --nocompile --unsecure --no-display-prompt --fast
) else (
  echo No .llamafile file found in data directory.
)

pause