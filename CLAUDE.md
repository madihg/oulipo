# Oulipo.xyz Project Guidelines

This file contains important guidelines for any AI agent working on the oulipo.xyz project.

## Screenshot Requirements

**IMPORTANT: All screenshots MUST have a 1px black border.**

When adding or updating screenshots for any work on oulipo.xyz:

1. Take the screenshot of the page/work
2. Add a 1px solid black border around the entire image
3. Save to `Assets/screenshots/` with a descriptive lowercase hyphenated name

### Python Script for Adding Borders

```python
from PIL import Image

def add_border(image_path, border_width=1, border_color=(0, 0, 0)):
    img = Image.open(image_path)
    new_width = img.width + 2 * border_width
    new_height = img.height + 2 * border_width
    bordered_img = Image.new('RGB', (new_width, new_height), border_color)
    bordered_img.paste(img, (border_width, border_width))
    bordered_img.save(image_path, quality=95)

# Apply to all screenshots
import os
for f in os.listdir("Assets/screenshots"):
    if f.endswith('.png'):
        add_border(f"Assets/screenshots/{f}")
```

## Brand Guidelines

See `.agents/skills/oulipo-brand/SKILL.md` for complete brand guidelines including:
- Typography (Standard, Terminal Grotesque, Diatype Variable, Diatype Mono Variable)
- Colors
- Layout specifications
- Font variation settings

## Key Fonts

- **Body text**: Standard
- **h1 headings**: Terminal Grotesque  
- **h2 headings**: Diatype Variable
- **Captions/metadata**: Diatype Mono Variable with `font-variation-settings: 'slnt' 0, 'MONO' 1;`

## Featured Works Section

The Featured Works section should contain a maximum of 3 items. Any additional works should go to "Selected Works" section.
