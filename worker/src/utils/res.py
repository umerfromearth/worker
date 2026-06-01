# Usage:
#   blender -b scene.blend -P set_resolution.py -- --width 1920 --height 1080
# (Render with normal Blender CLI flags, e.g. add: -f 1 or -a)

import sys
import bpy

def _args_after_double_dash(argv):
    return argv[argv.index("--") + 1 :] if "--" in argv else []

args = _args_after_double_dash(sys.argv)

width = None
height = None
it = iter(args)
for a in it:
    if a == "--width":
        width = int(next(it))
    elif a == "--height":
        height = int(next(it))

scene = bpy.context.scene
if width is not None:
    scene.render.resolution_x = width
if height is not None:
    scene.render.resolution_y = height      