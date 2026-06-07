# Manual test: hub.motion_sensor yaw derived from drivebase movement
# Run this in the simulator UI to verify the IMU/motion sensor.
#
# The default robot has 56mm wheels and a 112mm axle track, so a single-wheel
# turn of 360 degrees rotates the robot ~90 degrees (900 decidegrees), and a
# full in-place pivot of 360 degrees rotates it ~180 degrees (1800 decidegrees).

import motor_pair
import runloop
from hub import port, motion_sensor


async def main():
    motor_pair.pair(motor_pair.PAIR_1, port.A, port.B)

    # Test 1: yaw starts at zero
    print("Test 1: Initial yaw")
    yaw = motion_sensor.tilt_angles()[0]
    print(f"Initial yaw: {yaw} (expected 0)")
    print("PASS\n" if yaw == 0 else "FAIL\n")

    # Test 2: driving straight does not change yaw
    print("Test 2: Drive straight")
    await motor_pair.move_for_degrees(motor_pair.PAIR_1, 360, 0, velocity=360)
    yaw = motion_sensor.tilt_angles()[0]
    print(f"Yaw after straight move: {yaw} (expected ~0)")
    print("PASS\n" if abs(yaw) < 50 else "FAIL\n")

    # Test 3: single-wheel turn rotates ~90 degrees clockwise
    print("Test 3: Turn right (left wheel only)")
    await motor_pair.move_tank_for_degrees(motor_pair.PAIR_1, 360, 360, 0)
    yaw = motion_sensor.tilt_angles()[0]
    print(f"Yaw after turn: {yaw} (expected ~900)")
    print("PASS\n" if abs(yaw - 900) < 100 else "FAIL\n")

    # Test 4: reset_yaw zeroes the heading
    print("Test 4: reset_yaw()")
    motion_sensor.reset_yaw(0)
    yaw = motion_sensor.tilt_angles()[0]
    print(f"Yaw after reset: {yaw} (expected 0)")
    print("PASS\n" if yaw == 0 else "FAIL\n")

    # Test 5: pitch and roll are always zero in Phase 1
    print("Test 5: Pitch and roll")
    _, pitch, roll = motion_sensor.tilt_angles()
    print(f"pitch={pitch}, roll={roll} (expected 0, 0)")
    print("PASS\n" if pitch == 0 and roll == 0 else "FAIL\n")

    # Test 6: full in-place pivot rotates ~180 degrees
    print("Test 6: Pivot in place")
    await motor_pair.move_for_degrees(motor_pair.PAIR_1, 360, 100, velocity=360)
    yaw = motion_sensor.tilt_angles()[0]
    print(f"Yaw after pivot: {yaw} (expected ~1800)")
    print("PASS\n" if abs(abs(yaw) - 1800) < 100 else "FAIL\n")


runloop.run(main())
