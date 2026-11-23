"""Extract a private contact sheet; never copy the supplied recording into the demo."""
import argparse, json
from pathlib import Path
import cv2
from PIL import Image, ImageDraw

p = argparse.ArgumentParser()
p.add_argument('video')
p.add_argument('--out', default='artifacts/reference-frames')
args = p.parse_args()
out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
cap = cv2.VideoCapture(args.video)
fps = cap.get(cv2.CAP_PROP_FPS); frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
if not cap.isOpened() or not fps:
    raise SystemExit('Cannot decode reference video')
duration = frames / fps
meta = {'fps': fps, 'frames': frames, 'duration_seconds': duration,
        'width': cap.get(cv2.CAP_PROP_FRAME_WIDTH), 'height': cap.get(cv2.CAP_PROP_FRAME_HEIGHT)}
(out/'metadata.json').write_text(json.dumps(meta, indent=2), encoding='utf-8')
sheet = Image.new('RGB', (4*280, 3*540), '#171a24')
draw = ImageDraw.Draw(sheet)
for i in range(12):
    t = duration * (i+.15)/12
    cap.set(cv2.CAP_PROP_POS_MSEC, t*1000)
    ok, frame = cap.read()
    if not ok: continue
    im = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    im.thumbnail((270,510))
    x, y = (i%4)*280, (i//4)*540
    sheet.paste(im, (x+(280-im.width)//2,y+24))
    draw.text((x+8,y+5), f'{t:.2f}s',fill='white')
    im.save(out/f'frame-{i:02d}.jpg',quality=88)
sheet.save(out/'contact-sheet.jpg',quality=92)
cap.release()
print(json.dumps(meta))
