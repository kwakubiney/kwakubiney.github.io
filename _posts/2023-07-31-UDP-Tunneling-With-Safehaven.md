---
title: UDP Tunneling With SafeHaven
date: 2023-07-31 17:12:01 +0000
categories: [Linux, Go]
tags: [Networking]
---

For a few months, I have been exploring tools which heavily utilize the Linux networking stack to do some cool stuff. Came across [Cilium](https://cilium.io/) and [Tailscale](https://tailscale.com/) too! Making a few [contributions](https://github.com/cilium/ebpf/commits?author=kwakubiney) to the Cilium project piqued my interest in the kernel networking domain, and I decided to build a collection of projects which will enhance my knowledge of how certain networking tools are built. The first one I set out to build was `SafeHaven`, a configurable product to illustrate how virtual private networks work!

## Why do virtual private networks even exist?

`VPNs` have become a widely commercialized product marketed as a tool which can be used for hiding identities (to an extent, from the POV of the resource holder and possibly the `ISP`) when accessing certain resources on the internet, or to just bypass certain network restrictions introduced by firewalls and other policies.

Interestingly, this is just scratching the surface of what that underlying idea can achieve. In the professional space, companies use this technology to restrict access to resources on private domains and networks. With the sudden burst of remote work, and just the general geographically sparse nature of teams nowadays, most private resources have to be accessed via the internet. _But hey, we cannot let anyone on the internet access our resources, can we_? I mean, we can, but we don’t want to.._hopefully_.

Organizations use IP ranges between `192.168.0.0/16` and `10.0.0.0/8` for computers within the local network and use firewalls to restrict ingress traffic. As the goal intended is resource secrecy, these address ranges (see: [RFC1918](https://datatracker.ietf.org/doc/html/rfc1918)) are not routable on the public internet. This is an issue for people who are not physically connected to the local network. The question then is, how do we make other allowed hosts outside the `LAN` reach these resources? Take a wild guess? Yes! Private networks, but make them ~~physical~~ `virtual`.

## Main problems faced when building this tool
1. How do I move packets to another host in another private network whilst providing transparency to the user?

2. Assuming we want to solve this problem on `L7` (Application Layer), how can we route traffic to the application layer from the kernel? Even if we receive the traffic at `L7`, the kernel strips away the `IP` headers and hence valuable packet data is lost.

3. Assuming packets have been received in userspace, our destination address remains unroutable on the internet, there has to be a receiving node on the internet which receives our packet, and hands it over to the destination private network. Which protocol do we use for this? `TCP`? `UDP`?

_This is the ultimate higher level idea we have so far, but how is this implemented?_

![architecture](https://github.com/kwakubiney/safehaven/assets/71296367/6cd952b8-a58c-436d-b537-d01b06fecba8)


# How SafeHaven works

The Linux kernel has a number of interfaces it uses to create links between kernel software and actual hardware on computers. Running `ip link show` in a Linux terminal will show you the network interfaces you have on your machine.
```
root@ubuntu-s-1vcpu-2gb-sfo3-01:~# ip link show
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP mode DEFAULT group default qlen 1000
    link/ether a2:15:b5:84:2c:f2 brd ff:ff:ff:ff:ff:ff
    altname enp0s3
    altname ens3
```
The kernel maintains a routing table which sends packets out on specific interfaces based on **(mostly)** the destination address of the host, as long as a match is found on the table. In our scenario, we want to be able to route traffic to the application layer, and not necessarily through a hardware interface. Virtual interfaces, specifically, `TUN/TAP ` devices, to the rescue!
`TUN` devices are `L3` virtual interfaces which create a link between userspace and the kernel networking stack, and that gives us some hope, at least.

`SafeHaven` establishes `TUN` devices on both the `tunnel client` and the `tunnel server`. My bad! I don't think I have introduced the nuances around a `client` and `server`, yet. Per this design, a `client` is the host sending packets and the `server` represents the exit node responsible for relaying the packet to the private network.

Our datapath is looking like this currently:

`kernel on client -> TUN on client -> TUNNEL -> TUN on server -> kernel on server`

![architecture](
https://github.com/kwakubiney/safehaven/assets/71296367/1263f881-2bcf-4b40-8cd5-8e968d70ae1e)


An `IP` address has to be assigned to the `TUN` interface since it exists on the `L3` and must be routable in the kernel. I use the [netlink](https://github.com/vishvananda/netlink) library to assign an `IP` to the virtual interface on both the client and the server. The datapath elaborates what we have talked about until we hit the abstraction in the middle, the _tunnel_. What exactly is this **tunnel**? Don’t fret, it’s plain old `UDP` encapsulation, in this case, but doesn’t really have to be. Protocol employed could be `TCP`, `WebSockets`, you name it. Each comes with its own respective tradeoffs.

When we run `SafeHaven` in `client` mode, routes are created which tunnel all egress traffic with the destination of the private address we want to reach through the `TUN` interface. Now this is where all the **FUN** happens! 

At this point, we need to have an exit node that knows how to reach the private network. We’ll run our application in server mode on that device. That’s our `tunnel server`. It must have an IP address that is routable on the internet. Seems we are getting closer to a solution by the minute...

_Moving encapsulated packets over the internet? Is that even possible?_

Yes! Here’s how! A `UDP` client is set up on the client application through which traffic is routed to a remote `UDP` server, which in this case is our exit node.

`SafeHaven` establishes a `UDP` server on our exit node, which listens on a public address and port for `UDP` packets. On receipt, these extra `UDP` headers are stripped, and the previously encapsulated packets are routed to the `TUN` device on the server so the packets can be routed via the server kernel’s routing table.


_Can I get a response back from the server? How?_

Yes, the server-side application maintains a concurrent map that keeps track of `UDP` connections when received so the server can tell which `UDP` connection to write to, to send a reply back to the client. This is essential because `UDP` is a connectionless protocol, and we need to keep state of the specific `UDP` connection which sends a particular packet, so we can write a response back.

**Ultimately**, this is what we achieve:

![architecture](https://github.com/kwakubiney/safehaven/assets/71296367/7a637a3f-337d-4e44-a793-4aa01049d191)

A demo of the application can be found [here](https://www.youtube.com/watch?v=BJcXyx5ae1Ac) and the source is free for all to view on [here](https://github.com/kwakubiney/safehaven)

# Limitations
Currently, packets are not being encrypted within the `UDP` tunnel so packet sniffing over the internet is possible. It is encouraged to use this over a protocol like `SSH`

Edit: Now supports encrytion with WireGuard!