<div align="center">
  <h1>github-stats-card-git</h1>
  <p>
    Dynamic, minimal GitHub stats card generator built with Next.js App Router. Features all-time GraphQL metrics, material-inspired language bars, customizable ambient glow, and zero avatar clutter.
  </p>

  <br />

  <img src="https://github-stats-card-eosin.vercel.app/api/card?username=alirezamoradiii&glow=89e051" alt="github-stats-card Card Preview" width="440" />

  <p>
  If you find this project useful, consider giving it a star.
  It helps others discover the project and motivates me to keep improving it.
</p>

[![GitHub stars](https://img.shields.io/github/stars/alirezamoradiii/github-stats-card?style=social)](https://github.com/alirezamoradiii/github-stats-card)

</div>

---

## Why gitSum?

Most GitHub stat cards suffer from visual bloat, 2018-era gradients, and brittle third-party dependencies. gitSum solves three concrete issues:

- **Local Vector Assets**: Language icons are bundled and parsed locally from disk. No external CDN downtime, zero third-party rate limits, and no Vercel IP-blocking issues.
- **Meaningful All-Time Aggregation**: Uses raw GitHub GraphQL queries with fallback handling to fetch true lifetime contributions, commits, PRs, and reviews.
- **Modern Layout Geometry**: Built around a 480x640 frame with floating-label progress bars, minimal typography, and an adjustable backdrop glow.

---

## Usage

Add the card to your profile `README.md` using standard Markdown image syntax:

```markdown
![gitSum](https://github-stats-card-eosin.vercel.app/api/card?username=YOUR_USERNAME&glow=38bdf8)
```

## Dynamic Glow Accent

Customize the ambient glow color by appending a HEX code without #:

```
![github-stats-card-git](https://github-stats-card-git-master-alireza-moradi.vercel.app/api/card?username=YOUR_USERNAME&glow=38bdf8)
```
---

## Support

If you find `github-stats-card` useful, please consider giving the repository a star. Your support is appreciated.
