# Example: drive a 300 mm square.
#
# Copy this whole file into the simulator's "Code Input" panel and press
# "Run Code". Nothing here is simulator-specific — it is plain SPIKE Prime
# Python and will run on real hardware too.
#
# What to watch while it runs:
#   * Console    — one line per side and per corner, with the live yaw reading.
#   * Dashboard  — motor velocities and positions, yaw, and the robot's (x, y).
#   * Field view — the robot outline driving the four sides and turning the
#                  four corners.
#
# The robot starts at (0, 0) facing +Y and finishes back at the start facing
# the same way, so the final yaw and position should both be back near zero.

import math

import motor_pair
import runloop
from hub import port, motion_sensor

# Drive motor ports (left and right when facing forward).
LEFT_PORT = port.A
RIGHT_PORT = port.B

# Robot geometry. These match the simulator's default configuration — if you
# change them in the "Robot Configuration" panel, change them here to match.
WHEEL_DIAMETER_MM = 56
AXLE_TRACK_MM = 112

SIDE_MM = 300   # length of one side of the square
VELOCITY = 360  # wheel speed in degrees per second


def mm_to_wheel_degrees(distance_mm):
    """Wheel rotation (degrees) that rolls the robot `distance_mm` forward."""
    return (distance_mm / (math.pi * WHEEL_DIAMETER_MM)) * 360


def turn_to_wheel_degrees(turn_degrees):
    """Wheel rotation (degrees) that pivots the robot `turn_degrees` in place.

    Pivoting counter-rotates both wheels, so each wheel traces an arc of radius
    AXLE_TRACK_MM / 2. Working that through leaves a pleasantly simple ratio.
    """
    return turn_degrees * AXLE_TRACK_MM / WHEEL_DIAMETER_MM


def yaw_degrees():
    """Heading in degrees, clockwise-positive (tilt_angles reports decidegrees)."""
    return motion_sensor.tilt_angles()[0] / 10


async def main():
    motor_pair.pair(motor_pair.PAIR_1, LEFT_PORT, RIGHT_PORT)
    motion_sensor.reset_yaw(0)
    print(f"Starting yaw: {yaw_degrees():.1f} deg")

    for side in range(4):
        print(f"Side {side + 1}: driving {SIDE_MM} mm forward")
        await motor_pair.move_for_degrees(
            motor_pair.PAIR_1,
            mm_to_wheel_degrees(SIDE_MM),
            0,  # steering 0 = straight ahead
            velocity=VELOCITY,
        )

        print("  corner: turning right 90 deg")
        await motor_pair.move_for_degrees(
            motor_pair.PAIR_1,
            turn_to_wheel_degrees(90),
            100,  # steering 100 = pivot in place, clockwise
            velocity=VELOCITY,
        )
        print(f"  yaw is now {yaw_degrees():.1f} deg")

    print(f"Done. Final yaw: {yaw_degrees():.1f} deg (expected ~0)")


runloop.run(main())
