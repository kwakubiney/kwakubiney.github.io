---
layout: page
icon: fas fa-user
order: 2
---

{% assign personal_posts = site.posts | where: "section", "personal" %}

{% if personal_posts.size > 0 %}
  <ul>
    {% for post in personal_posts %}
      <li>
        <a href="{{ post.url | relative_url }}">{{ post.title }}</a><br>
        <small>{{ post.date | date: "%b %-d, %Y" }}</small>
      </li>
    {% endfor %}
  </ul>
{% else %}
  <p>No personal posts yet.</p>
{% endif %}
