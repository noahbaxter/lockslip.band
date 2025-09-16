# 🎸 Lockslip Website - How to Update Your Content

This guide shows you how to update your band's website content easily, without any coding knowledge required.

## 📁 Where Your Content Lives

All your website content is stored in simple text files in the `content` folder:

- **`site-config.json`** - Band name, social media links, contact info
- **`shows.json`** - Concert dates and venues
- **`releases.json`** - Albums, EPs, and music streaming links
- **`merchandise.json`** - T-shirts, vinyl, and other merch
- **`media.json`** - Photos, videos, and press coverage

## ✏️ How to Make Changes

### Step 1: Open the File
Find the file you want to edit (like `shows.json` for concerts) and open it in any text editor.

### Step 2: Make Your Changes
Follow the examples below for what you want to update.

### Step 3: Save and Refresh
Save the file, then refresh your website - changes appear instantly!

---

## 🎤 Adding a New Show

**Open:** `content/shows.json`

**Copy this template and fill it in:**
```
{
  "id": "2025-01-15",
  "date": {
    "month": "JAN",
    "day": "15", 
    "year": "2025"
  },
  "venue": "The Venue Name",
  "location": "City, State",
  "bands": ["Opening Band", "Lockslip", "Headliner"],
  "ticketsUrl": "https://link-to-buy-tickets.com"
}
```

**What each part means:**
- `id` - Any unique name for this show (use the date)
- `date` - Month as 3 letters, day as number, year as 4 digits
- `venue` - Name of the place you're playing
- `location` - City and state/country
- `bands` - List all bands playing (put Lockslip where you fit in the lineup)
- `ticketsUrl` - Link where people can buy tickets

**Adding a poster:** If you have a concert poster, save it in `images/show-posters/` and add:
```
"poster": "images/show-posters/2025_01_15.jpg"
```

---

## 🎵 Adding a New Release

**Open:** `content/releases.json`

**Copy this template:**
```
{
  "id": "your-new-album",
  "title": "Album Name",
  "description": "Tell people about this release - what it sounds like, when you recorded it, etc.",
  "year": "2025",
  "month": "March",
  "day": "15",
  "coverImage": "images/releases/album-cover.jpg",
  "tracks": [
    "1. Song One",
    "2. Song Two", 
    "3. Song Three"
  ],
  "streamingLinks": {
    "spotify": "https://open.spotify.com/album/your-album-id",
    "apple": "https://music.apple.com/album/your-album-id"
  }
}
```

**Don't forget to:**
- Save your album cover image in `images/releases/`
- Update the streaming links with your actual URLs

---

## 🛍️ Adding Merchandise

**Open:** `content/merchandise.json`

**Copy this template:**
```
{
  "id": "t-shirt-black",
  "name": "Black T-Shirt",
  "price": "$25",
  "description": "100% cotton, sizes S-XL",
  "images": [
    "images/merch/shirt-front.jpg",
    "images/merch/shirt-back.jpg"
  ],
  "purchaseUrl": "https://your-store.com/product-link",
  "inStock": true
}
```

**Notes:**
- Set `inStock: false` to hide sold-out items
- Add multiple images to show front/back views

---

## 📱 Updating Social Media Links

**Open:** `content/site-config.json`

**Find the social media section and update your URLs:**
```
"socialMedia": [
  {
    "platform": "Instagram",
    "url": "https://www.instagram.com/your-band-name/"
  },
  {
    "platform": "Twitter", 
    "url": "https://twitter.com/your-band-name"
  }
]
```

---

## 📸 Adding Photos and Videos

**Open:** `content/media.json`

**For photos:**
1. Save your photo in `images/live-photos/`
2. Add this to the photos section:
```
{
  "image": "images/live-photos/concert-photo.jpg",
  "caption": "Lockslip at The Venue - March 2025"
}
```

**For videos:**
1. Upload your video to YouTube
2. Add this to the videos section:
```
{
  "title": "Live Performance at The Venue",
  "youtubeId": "dQw4w9WgXcQ",
  "thumbnail": "images/videos/video-thumbnail.jpg"
}
```

---

## 🔧 Quick Fixes

### Remove an Old Show
1. Open `shows.json`
2. Find the show you want to remove
3. Delete everything from `{` to `}` for that show
4. Make sure you don't have extra commas

### Update Contact Email
1. Open `site-config.json`
2. Find `"booking": "lockslipband@gmail.com"`
3. Change to your new email

### Hide Sold-Out Merch
1. Open `merchandise.json`  
2. Find the item you want to hide
3. Change `"inStock": true` to `"inStock": false`

---

## ⚠️ Important Rules

1. **Always use double quotes** around text: `"like this"` not `'like this'`
2. **Commas matter**: Put a comma after each item, except the very last one
3. **File names are case-sensitive**: `photo.jpg` is different from `Photo.JPG`
4. **Test your changes**: Save and refresh to make sure everything works

## 🆘 If Something Breaks

1. **Check for typos** - especially missing quotes or commas
2. **Copy your text to jsonlint.com** - it will tell you if there are errors
3. **Look at the working examples** in the files for reference
4. **Make a backup** before making big changes

## 📞 Need Help?

If you get stuck:
1. Compare your changes to the existing examples
2. Check that all your image files actually exist in the right folders
3. Make sure all web links start with `https://`

The website will show an error message if something is wrong with your content files.