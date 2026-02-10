from PIL import Image, ImageDraw, ImageFont
import os

albums = [
    ("Abbey Road", "The Beatles", (179, 136, 84)),
    ("Led Zeppelin IV", "Led Zeppelin", (45, 40, 35)),
    ("Dark Side of the Moon", "Pink Floyd", (20, 20, 25)),
    ("Rumours", "Fleetwood Mac", (50, 48, 52)),
    ("Who's Next", "The Who", (180, 180, 180)),
    ("Back in Black", "AC/DC", (15, 15, 15)),
    ("Hotel California", "Eagles", (210, 160, 110)),
    ("OK Computer", "Radiohead", (150, 200, 220)),
    ("Nevermind", "Nirvana", (100, 180, 220)),
    ("The Bends", "Radiohead", (200, 100, 100)),
    ("Disintegration", "The Cure", (180, 160, 180)),
    ("Automatic for the People", "R.E.M.", (80, 100, 120)),
    ("Siamese Dream", "The Smashing Pumpkins", (240, 180, 120)),
    ("Morning Glory", "Oasis", (220, 200, 150)),
]

for i, (title, artist, color) in enumerate(albums, 1):
    # Create a 500x500 image with the album's color
    img = Image.new('RGB', (500, 500), color)
    draw = ImageDraw.Draw(img)
    
    # Add text in center
    try:
        font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 40)
        font_artist = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 30)
    except:
        font_title = ImageFont.load_default()
        font_artist = ImageFont.load_default()
    
    # Calculate text position for centering
    # Draw title
    bbox = draw.textbbox((0, 0), title, font=font_title)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (500 - text_width) / 2
    y = (500 - text_height) / 2 - 30
    
    # Draw white text with black outline for visibility
    draw.text((x, y), title, fill=(255, 255, 255), font=font_title, stroke_width=2, stroke_fill=(0, 0, 0))
    
    # Draw artist
    bbox = draw.textbbox((0, 0), artist, font=font_artist)
    text_width = bbox[2] - bbox[0]
    x = (500 - text_width) / 2
    y += 60
    draw.text((x, y), artist, fill=(200, 200, 200), font=font_artist, stroke_width=1, stroke_fill=(0, 0, 0))
    
    # Save
    img.save(f'cover-{i}.jpg', 'JPEG', quality=90)
    print(f"Created cover-{i}.jpg for {title}")

print("Done!")
