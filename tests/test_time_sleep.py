# Manual test: time.sleep_ms() blocking behavior
# Run this in the simulator UI to verify time.sleep_ms works correctly.

import time

# Test 1: Sequential execution order
# "before" must appear before "after" in the console output
print("Test 1: Sequential execution order")
print("before")
time.sleep_ms(500)
print("after")
print("PASS: If 'before' appeared before 'after'\n")

# Test 2: Elapsed time is realistic
print("Test 2: Elapsed time check")
start = time.ticks_ms()
time.sleep_ms(200)
elapsed = time.ticks_diff(time.ticks_ms(), start)
print(f"Expected ~200ms, got {elapsed}ms")
if elapsed >= 180:
    print("PASS: Elapsed time is reasonable\n")
else:
    print(f"FAIL: Elapsed time too short ({elapsed}ms < 180ms)\n")

# Test 3: Usable from a regular (non-async) function
print("Test 3: Callable from non-async function")
def blocking_wait():
    print("Entering blocking_wait()")
    time.sleep_ms(100)
    print("Exiting blocking_wait()")

blocking_wait()
print("PASS: sleep_ms works in a regular def\n")

# Test 4: Works inside runloop.run() alongside async code
import runloop

async def async_with_blocking_sleep():
    print("Test 4: sleep_ms inside async function via runloop")
    time.sleep_ms(100)
    print("PASS: sleep_ms works inside async context\n")

runloop.run(async_with_blocking_sleep())
