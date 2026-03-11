// Generator for static/og-image.png — the Open Graph / Twitter Card image.
// Run from the project root: go run ./scripts/gen_og_image/
// Outputs: static/og-image.png (1200×630)

package main

import (
	"image"
	"image/color"
	"image/png"
	"math"
	"os"

	"golang.org/x/image/font"
	"golang.org/x/image/font/gofont/gobold"
	"golang.org/x/image/font/gofont/goregular"
	"golang.org/x/image/font/opentype"
	"golang.org/x/image/math/fixed"
	"golang.org/x/image/vector"
)

const (
	W = 1200
	H = 630
)

type pt struct{ x, y float32 }

func main() {
	img := image.NewNRGBA(image.Rect(0, 0, W, H))

	drawGradient(img)
	drawShield(img)
	drawBrackets(img)

	boldFace := mustFace(gobold.TTF, 88)
	defer boldFace.Close()
	subFace := mustFace(goregular.TTF, 30)
	defer subFace.Close()
	tagFace := mustFace(goregular.TTF, 22)
	defer tagFace.Close()

	white := image.NewUniform(color.NRGBA{255, 255, 255, 255})
	soft := image.NewUniform(color.NRGBA{255, 255, 255, 204})

	drawCentered(img, boldFace, "Secure-UI", W/2, 430, white)
	drawCentered(img, subFace, "Security-First Web Components", W/2, 476, soft)
	drawCentered(img, tagFace, "Zero dependencies  ·  CSP-safe  ·  Framework-agnostic", W/2, 520, soft)

	out, err := os.Create("../../static/og-image.png")
	if err != nil {
		panic(err)
	}
	defer out.Close()
	if err := png.Encode(out, img); err != nil {
		panic(err)
	}
}

// mustFace parses a TTF byte slice and returns a font.Face at the given point size.
func mustFace(ttf []byte, size float64) font.Face {
	parsed, err := opentype.Parse(ttf)
	if err != nil {
		panic(err)
	}
	face, err := opentype.NewFace(parsed, &opentype.FaceOptions{Size: size, DPI: 72})
	if err != nil {
		panic(err)
	}
	return face
}

// drawGradient fills the image with a diagonal gradient from #667eea (top-left)
// to #764ba2 (bottom-right), matching the favicon colours.
func drawGradient(img *image.NRGBA) {
	for y := 0; y < H; y++ {
		for x := 0; x < W; x++ {
			t := float64(x)/float64(W)*0.55 + float64(y)/float64(H)*0.45
			img.SetNRGBA(x, y, color.NRGBA{
				R: lerpU8(0x66, 0x76, t),
				G: lerpU8(0x7e, 0x4b, t),
				B: lerpU8(0xea, 0xa2, t),
				A: 255,
			})
		}
	}
}

func lerpU8(a, b uint8, t float64) uint8 {
	return uint8(math.Round(float64(a)*(1-t) + float64(b)*t))
}

// drawShield renders the shield polygon (same path as favicon.svg) scaled to
// 200×280 px, centred at (600, 200). Filled with white at 20% opacity.
func drawShield(img *image.NRGBA) {
	// Original path in 32×32 viewBox:
	//   M16 2  L6 6  L6 14  Q6 22 16 30  Q26 22 26 14  L26 6  Z
	// Scale = 10, offset so centre (16,16) maps to (600, 205):
	//   ox = 600 − 16×10 = 440,  oy = 205 − 16×10 = 45
	const s = float32(10)
	const ox, oy = float32(440), float32(45)

	ras := vector.NewRasterizer(W, H)
	ras.MoveTo(16*s+ox, 2*s+oy)
	ras.LineTo(6*s+ox, 6*s+oy)
	ras.LineTo(6*s+ox, 14*s+oy)
	ras.QuadTo(6*s+ox, 22*s+oy, 16*s+ox, 30*s+oy)
	ras.QuadTo(26*s+ox, 22*s+oy, 26*s+ox, 14*s+oy)
	ras.LineTo(26*s+ox, 6*s+oy)
	ras.ClosePath()

	ras.Draw(img, img.Bounds(), image.NewUniform(color.NRGBA{255, 255, 255, 51}), image.Point{})
}

// drawBrackets renders the <  > code symbols inside the shield in solid white.
func drawBrackets(img *image.NRGBA) {
	const s = float32(10)
	const ox, oy = float32(440), float32(45)
	white := color.NRGBA{255, 255, 255, 255}
	const sw = float32(11) // stroke width in pixels

	// Left bracket  <  :  M14 10  L10 16  L14 22
	strokeLine(img, pt{14*s + ox, 10*s + oy}, pt{10*s + ox, 16*s + oy}, white, sw)
	strokeLine(img, pt{10*s + ox, 16*s + oy}, pt{14*s + ox, 22*s + oy}, white, sw)

	// Right bracket  >  :  M18 10  L22 16  L18 22
	strokeLine(img, pt{18*s + ox, 10*s + oy}, pt{22*s + ox, 16*s + oy}, white, sw)
	strokeLine(img, pt{22*s + ox, 16*s + oy}, pt{18*s + ox, 22*s + oy}, white, sw)
}

// strokeLine draws a thick line from a to b by stamping filled circles along it.
func strokeLine(img *image.NRGBA, a, b pt, c color.NRGBA, width float32) {
	dx := b.x - a.x
	dy := b.y - a.y
	dist := float32(math.Sqrt(float64(dx*dx + dy*dy)))
	if dist == 0 {
		return
	}
	steps := int(dist * 2)
	r := int(math.Round(float64(width) / 2))
	r2 := r * r
	for i := 0; i <= steps; i++ {
		t := float32(i) / float32(steps)
		px := int(math.Round(float64(a.x + dx*t)))
		py := int(math.Round(float64(a.y + dy*t)))
		for cy := -r; cy <= r; cy++ {
			for cx := -r; cx <= r; cx++ {
				if cx*cx+cy*cy <= r2 {
					nx, ny := px+cx, py+cy
					if nx >= 0 && nx < W && ny >= 0 && ny < H {
						img.SetNRGBA(nx, ny, c)
					}
				}
			}
		}
	}
}

// drawCentered draws text horizontally centred around cx at baseline y.
func drawCentered(img *image.NRGBA, face font.Face, text string, cx, y int, src image.Image) {
	d := &font.Drawer{Dst: img, Src: src, Face: face}
	w := d.MeasureString(text)
	d.Dot = fixed.Point26_6{
		X: fixed.I(cx) - w/2,
		Y: fixed.I(y),
	}
	d.DrawString(text)
}
