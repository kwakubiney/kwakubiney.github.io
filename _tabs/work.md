---
layout: page
icon: fas fa-briefcase
order: 3
---

{% assign work_posts = site.posts | where: "section", "work" %}

{% if work_posts.size > 0 %}
  <ul>
    {% for post in work_posts %}
      <li>
        <a href="{{ post.url | relative_url }}">{{ post.title }}</a><br>
        <small>{{ post.date | date: "%b %-d, %Y" }}</small>
      </li>
    {% endfor %}
  </ul>
{% else %}
  <p>No work posts yet.</p>
{% endif %}
