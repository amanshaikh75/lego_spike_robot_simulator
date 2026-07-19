from hub import port
import motor_pair
import motor
import runloop

from hub import motion_sensor

#
# Configuration of the robot and functions for movements.
#

# Wheel measurements.
WHEEL_TO_WHEEL_DIST = 5.75 # inch
WHEEL_DIAM = 3.4375 # inch

# Left and right wheel ports relative to the robot moving in the forward direction.
# The forward direction is the one towards the dozer arm.
LEFT_WHEEL_PORT = port.A
RIGHT_WHEEL_PORT = port.E

# Ports for the arms
DOZER_BLADE_PORT = port.C
LIFT_ARM_PORT = port.D

def set_yaw_to_zero():
    motion_sensor.set_yaw_face(motion_sensor.TOP)
    yaw_face = motion_sensor.get_yaw_face()
    print('yaw_face: ', yaw_face)
    motion_sensor.reset_yaw(0)

def get_yaw():
    (yaw, _, _) = motion_sensor.tilt_angles()
    return yaw

def get_velocity(wheel_degrees=0, curr_wheel_degrees=0,
                 velocity_degrees=0, curr_velocity_degrees=0):
    if abs(curr_velocity_degrees) < abs(velocity_degrees):
        if velocity_degrees:
            return curr_velocity_degrees + 2
        return curr_velocity_degrees - 2
    wheel_diff = abs(wheel_degrees) - abs(curr_wheel_degrees)
    if wheel_diff < 360 and abs(curr_velocity_degrees) > 15:
        if velocity_degrees > 0:
            return curr_velocity_degrees - 2
    return curr_wheel_degrees + 2

async def turn_robot_by_degrees(left_turn, turn_degrees, forward, velocity_degrees):
    assert turn_degrees > 0
    # Choose the port that moves.
    port = RIGHT_WHEEL_PORT if left_turn else LEFT_WHEEL_PORT
    # Determine how much the wheel should move.
    wheel_degrees = (turn_degrees * WHEEL_TO_WHEEL_DIST * 2) / WHEEL_DIAM
    if (forward and not left_turn) or (not forward and left_turn):
        wheel_degrees = -wheel_degrees
    print('required degrees for the wheel to turn: ', int(wheel_degrees))
    curr_wheel_degrees = 0
    curr_velocity_degrees = 0
    motor.reset_relative_position(port, 0)
    i = 0
    while abs(curr_wheel_degrees) < abs(wheel_degrees):
        # Adjust the speed if needed.
        curr_velocity_degrees = get_velocity(
            wheel_degrees=wheel_degrees,
            curr_velocity_degrees=curr_velocity_degrees,
            velocity_degrees=velocity_degrees,
            curr_wheel_degrees=curr_wheel_degrees)
        # Move the motor.
        motor.run(port, curr_velocity_degrees)
        # Sleep a bit.
        await runloop.sleep_ms(1)
        # Determine how much we have moved.
        curr_wheel_degrees = motor.relative_position(port)
        if i % 100 == 0:
            print('i: ', i, ' curr_wheel_degrees: ', curr_wheel_degrees,
                  ' wheel_degrees: ', wheel_degrees,
                  ' curr_velocity_degrees: ', curr_velocity_degrees)
        i += 1
    motor.stop(port)

async def move_robot_by_dist(pair, forward, dist_inch, velocity_degrees):
    assert dist_inch > 0
    wheel_degrees = (360 * dist_inch) / (3.14 * WHEEL_DIAM)
    if forward:
        wheel_degrees = -wheel_degrees
    print('required degrees for both wheels to turn: ', int(wheel_degrees))
    curr_wheel_degrees = 0
    curr_velocity_degrees = 0
    motor.reset_relative_position(LEFT_WHEEL_PORT, 0)
    i = 0
    while abs(curr_wheel_degrees) < abs(wheel_degrees):
        # Adjust the speed if needed.
        curr_velocity_degrees = get_velocity(
            wheel_degrees=wheel_degrees,
            curr_velocity_degrees=curr_velocity_degrees,
            velocity_degrees=velocity_degrees,
            curr_wheel_degrees=curr_wheel_degrees)
        # Move the motor.
        motor_pair.move_tank(pair, curr_velocity_degrees, curr_velocity_degrees)
        # Sleep a bit.
        await runloop.sleep_ms(1)
        # Determine how much we have moved.
        curr_wheel_degrees = motor.relative_position(LEFT_WHEEL_PORT)
        if i % 100 == 0:
            print('i: ', i, ' curr_wheel_degrees: ', curr_wheel_degrees,
                  ' wheel_degrees: ', wheel_degrees,
                  ' curr_velocity_degrees: ', curr_velocity_degrees)
        i += 1
    motor_pair.stop(pair)

async def move_lift_arm(up, rotate_degrees, velocity_degrees):
    if not up:
        rotate_degrees = -rotate_degrees
    await motor.run_for_degrees(LIFT_ARM_PORT, rotate_degrees, velocity_degrees)

async def move_dozer_blade(up, rotate_degrees, velocity_degrees):
    if up:
        rotate_degrees = -rotate_degrees
    await motor.run_for_degrees(DOZER_BLADE_PORT, rotate_degrees, velocity_degrees)

async def main():

    # Place the robot in 'reverse' position.
    set_yaw_to_zero()
    print('yaw before starting the journey: ', get_yaw())
    motor_pair.pair(motor_pair.PAIR_1, RIGHT_WHEEL_PORT, LEFT_WHEEL_PORT)

    # Go to the holograph performer and push the orange activator.
    DIST_TO_TURN_POINT = 11.75 # inches
    AMOUNT_TO_TURN = 82.5 # Degrees
    DIST_TO_PUSH_ORANGE_ACTIVATOR = 7 # inches
    await motor.run_for_degrees(port.D, 360, 360)
    await move_robot_by_dist(motor_pair.PAIR_1, False, DIST_TO_TURN_POINT, 180)
    print('yaw after going straight: ', get_yaw())
    await turn_robot_by_degrees(True, AMOUNT_TO_TURN, False, 60)
    print('yaw after turning: ', get_yaw())
    await move_robot_by_dist(motor_pair.PAIR_1, False,
                             DIST_TO_PUSH_ORANGE_ACTIVATOR, 270)
    print('yaw after going straight: ', get_yaw())

    """
    # Bring the robot back to its starting position.
    await move_robot_by_dist(
        motor_pair.PAIR_1, True,
        DIST_TO_PUSH_ORANGE_ACTIVATOR, 180)
    await turn_robot_by_degrees(True, AMOUNT_TO_TURN, True, 60)
    await move_robot_by_dist(motor_pair.PAIR_1, True, DIST_TO_TURN_POINT, 180)
    """

    # Go to the sound mixer and push the orange activator up.
    DIST_FROM_HOLOGRAM_ACTIVATOR = 4 # inches
    DIST_TO_SOUND_MIXER_ACTIVATOR = 2.5 # inches
    LIFT_ARM_TURN_FOR_MIXER_ACTIVATOR = 188
    await move_robot_by_dist(
        motor_pair.PAIR_1, True, DIST_FROM_HOLOGRAM_ACTIVATOR, 200)
    await motor.run_for_degrees(port.C, 360, 360)
    await turn_robot_by_degrees(
        False, LIFT_ARM_TURN_FOR_MIXER_ACTIVATOR, True, 100)
    await motor.run_for_degrees(port.D, -360, 360)
    await move_robot_by_dist(
        motor_pair.PAIR_1, True, DIST_TO_SOUND_MIXER_ACTIVATOR, 200)
    await motor.run_for_degrees(port.D, 360, 1080)

    """ For the hologram sound mixer: push the orange activator, and turn
    right to push the activator further.
    LIFT_ARM_UP1_DIST = 40 # degrees
    LIFT_ARM_UP2_DIST = 30 # degress
    assert LIFT_ARM_UP1_DIST > LIFT_ARM_UP2_DIST
    LIFT_ARM_VELOCITY = 10 # degrees/sec
    await move_lift_arm(True, LIFT_ARM_UP1_DIST, LIFT_ARM_VELOCITY)
    await move_lift_arm(False, LIFT_ARM_UP1_DIST, LIFT_ARM_VELOCITY)
    await move_lift_arm(True, LIFT_ARM_UP2_DIST, LIFT_ARM_VELOCITY)
    await runloop.sleep_ms(200)
    await turn_robot_by_degrees(False, True, 15, 30)
    await turn_robot_by_degrees(False, False, 20, 30)
    print('yaw after turning: ', get_yaw())
    await move_lift_arm(False, LIFT_ARM_UP2_DIST, LIFT_ARM_VELOCITY)
    """

# Don't Give Up, I Believe In You
runloop.run(main())
