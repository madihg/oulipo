import math, io

G = 16            # logical cells - one chunky module, so the set holds at 44px
C = 64            # px per module
SIZE = G * C
OUT = "Assets/derive-community"

PAPER="#fbfbf9"; INK="#0b0b0d"; BLUE="#1c39e8"
CHROME="#b8bcc2"; CHROME_ALT="#9aa0a8"; COPPER="#c9772e"
CX = CY = 7.5

def inside(x, y, r=7.3):
    return math.hypot(x-CX, y-CY) <= r

class Art:
    def __init__(self): self.p=[]
    def cell(self, x, y, color, inset=0, guard=True):
        if guard and not inside(x, y): return
        self.p.append(f'<rect x="{x*C+inset}" y="{y*C+inset}" width="{C-2*inset}" '
                      f'height="{C-2*inset}" fill="{color}"/>')
    def svg(self):
        return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{SIZE}" height="{SIZE}" '
                f'viewBox="0 0 {SIZE} {SIZE}"><rect width="{SIZE}" height="{SIZE}" '
                f'fill="{PAPER}"/>{"".join(self.p)}</svg>')

def outline(a, x0, y0, w, h, color, chamfer=0):
    for x in range(x0, x0+w):
        for y in range(y0, y0+h):
            edge = x in (x0, x0+w-1) or y in (y0, y0+h-1)
            if not edge: continue
            if chamfer:
                near = min(abs(x-x0)+abs(y-y0), abs(x-(x0+w-1))+abs(y-y0),
                           abs(x-x0)+abs(y-(y0+h-1)), abs(x-(x0+w-1))+abs(y-(y0+h-1)))
                if near < chamfer: continue
            else:
                if (x, y) in [(x0,y0),(x0+w-1,y0),(x0,y0+h-1),(x0+w-1,y0+h-1)]: continue
            a.cell(x, y, color)

# 1. derive - the plan grid, and the walk that ignores it
def derive():
    a = Art()
    for gx in range(1, 16, 3):
        for gy in range(1, 16, 3):
            if inside(gx, gy, 6.6): a.cell(gx, gy, CHROME, inset=22)
    path = [(3,12),(4,12),(5,12),(5,11),(5,10),(6,10),(7,10),(7,9),(7,8),(6,8),
            (6,7),(7,7),(8,7),(9,7),(9,6),(9,5),(10,5),(11,5),(11,4),(12,4)]
    for x, y in path: a.cell(x, y, INK)
    a.cell(3, 12, BLUE)
    a.cell(12, 4, COPPER)
    return a

# 2. announcements - one source, the signal thinning as it goes
def announcements():
    a = Art()
    for x in (3, 4):
        for y in (7, 8): a.cell(x, y, BLUE)
    for r, col in ((3.2, INK), (5.2, CHROME_ALT), (7.2, CHROME)):
        for x in range(G):
            for y in range(G):
                d = math.hypot(x-3.5, y-7.5)
                if abs(d-r) < 0.5 and x > 4 and abs(math.atan2(y-7.5, x-3.5)) < 0.5:
                    a.cell(x, y, col)
    return a

# 3. derive sf - the pyramid, and the fog that keeps arriving
def sf():
    a = Art()
    for y in range(3, 13):
        half = int((y-3)*0.62)
        for x in range(7-half, 8+half): a.cell(x, y, INK)
    def on_pyramid(x, y):
        if not (3 <= y <= 12): return False
        half = int((y-3)*0.62)
        return 7-half <= x <= 7+half
    for band, col in ((6, CHROME), (9, CHROME_ALT), (11, CHROME)):
        for x in range(G):
            if (x + band) % 6 < 4 and not on_pyramid(x, band): a.cell(x, band, col)
    a.cell(7, 2, COPPER)
    for x in range(G): a.cell(x, 13, CHROME)
    return a

# 4. derive barcelona - one cerda block, and the diagonal through it
def barcelona():
    a = Art()
    for t in range(G*3):
        x, y = round(t*0.34), round(14 - t*0.34)
        a.cell(x, y, COPPER)
    outline(a, 4, 4, 9, 9, INK, chamfer=2)
    for x in (7, 8):
        for y in (7, 8): a.cell(x, y, BLUE)

    return a

# 5. general - two people talking, and a third about to
def general():
    a = Art()
    outline(a, 2, 3, 9, 6, INK)
    a.cell(4, 9, INK); a.cell(4, 10, INK)
    outline(a, 7, 7, 7, 6, BLUE)
    a.cell(11, 13, BLUE); a.cell(11, 14, BLUE)
    a.cell(4, 5, CHROME_ALT); a.cell(6, 5, CHROME_ALT); a.cell(8, 5, COPPER)
    return a

for name, fn in (("derive", derive), ("announcements", announcements),
                 ("derive-sf", sf), ("derive-barcelona", barcelona),
                 ("general", general)):
    io.open(f"{OUT}/{name}.svg", "w", encoding="utf-8").write(fn().svg())
print("ok")
