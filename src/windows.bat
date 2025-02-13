@echo off
start "" "data\StegLLM.html"

set "llamafile="
for %%a in (data\*.llamafile) do (
  if not defined llamafile (
    set "llamafile=%%a"
  )
)
if defined llamafile (
  start "" /high /b "%llamafile%" -c 8192 --no-mmap  --log-disable  --nocompile --unsecure --no-display-prompt --fast --server -spf system_prompt.txt --port 8090 --nobrowser
) else (
  echo No .llamafile file found in data directory.
)

pause