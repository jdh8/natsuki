# M2 single-node 8xH200 rental scout

Checked 2026-08-11 17:38 UTC. This is a launch-time shortlist, not a durable
price sheet: marketplace inventory can disappear between the check and the
create request.

## Recommendation

Use the **live Vast US offer `20654524`** if it is still present at launch. It
was verified and rentable in the marketplace query, reported 478.1 GB/s
NVLink, and costs $34.98/hour with 900 GB storage. This is the strongest
confirmed-now route.

If it disappears, check Verda and Runpod in that order. Both expose the exact
SXM/HGX-style route, but their final inventory needs an account. Do not choose
Massed Compute solely on price: its $30.56/hour self-service SKU is H200 NVL,
not H200 SXM/HGX, and the public page does not prove full eight-GPU NVSwitch
topology.

Verda spot is the cheapest headline route, but an interruption after a 681 GB
download would erase the saving. Use it only with a persistent checkpoint
volume or after an on-demand technical run has proved the recipe.

## Ranked options

| Route | Current price | Availability evidence | Fit and risk |
| --- | ---: | --- | --- |
| Vast.ai, live US offer `20654524` | $34.9836/h including 900 GB | A live first-party marketplace API query returned four verified, rentable 8xH200 machines. | This offer reported 478.1 GB/s NVLink, 7.747 Gb/s download, 99.966% reliability, and negligible transfer pricing. Marketplace/container variance is higher than a neocloud VM, but this is the best inventory that was independently visible without credentials. Vast bills by the second. [Search API](https://docs.vast.ai/api-reference/search/search-offers) [Billing](https://docs.vast.ai/guides/instances/pricing) |
| Verda, 8x H200 SXM5 | $32.00/h on demand; $11.20/h spot, plus storage | Exact stock is available only from the authenticated availability API. | 1x/2x/4x/8x self-service VMs, claimed 30-second provisioning, API/CLI/Terraform, and ten-minute billing increments. A 900 GiB NVMe volume is about $0.25/h. Spot may be reclaimed. [Current pricing](https://verda.com/pricing) [GPU instances](https://verda.com/gpu-instances) [API](https://api.verda.com/v1/docs) |
| Runpod, 8x H200 Pod | $28.72/h lowest marketplace result; $36.72/h Secure-only result | An unauthenticated first-party GraphQL query for `gpuCount: 8` returned `stockStatus: Low` for both results. | Dedicated Pod, no ingress/egress fees, per-second billing, API/CLI, and automatic termination flags. The live API and public pricing page disagree, so accept only the final console/API quote. `availableGpuCounts` was null, so `Low` is not a placement guarantee. [Availability query contract](https://docs.runpod.io/sdks/graphql/manage-pods) [Pod pricing](https://docs.runpod.io/pods/pricing) [Create API](https://docs.runpod.io/api-reference/pods/POST/pods) |
| Nebius, 8x H200 NVLink | $36.00/h on demand; $19.60/h preemptible, plus disk | Capacity requires the authenticated capacity advisor. Default regular-H200 quota is 32 GPUs in `eu-north1` and 8 in `eu-west1`, but physical capacity still varies. | Exact `8gpu-128vcpu-1600gb` preset, free network transfer, CLI/Terraform, and persistent disks. Preemptible is attractive only after staging the weights. New accounts have a $25 first-payment minimum. [Pricing](https://nebius.com/prices) [H200 preset](https://docs.nebius.com/compute/virtual-machines/types) [Capacity advisor](https://docs.nebius.com/compute/virtual-machines/capacity-advisor) |
| Crusoe, 8x H200 HGX | $34.32/h | First-party page says H200 is available now; project capacity is not publicly queryable. | Reliable API/CLI/Terraform route with zero egress, but no price or availability advantage over the confirmed Vast offer. [Pricing](https://www.crusoe.ai/cloud/pricing) |
| Massed Compute, 8x H200 NVL with NVLink | $30.56/h | The current first-party pricing page presents an active `Deploy` route; exact inventory needs login/API authentication. | 1.76 TB RAM and 6 TB local storage included; no bandwidth fees; one-hour minimum; roughly 90-second claimed setup. The cheap self-service SKU is NVL rather than SXM/HGX, and its full topology is undocumented. Require `nvidia-smi topo -m` plus an all-to-all P2P check before downloading weights. Its separately advertised H200 SXM cluster starts at two nodes and typically takes one business day, so that route is outside this experiment. [Pricing](https://vm.massedcompute.com/pricing) [Cluster topology](https://massedcompute.com/products/gpu-clusters/) [API and billing details](https://massedcompute.com/products/inventory-api/) |

Hyperstack is not a current fallback: its live stock page reported zero 8xH200
configurations in every public region at the time of the check. Its on-demand
rate is $3.99/GPU-hour when capacity returns. [Live stock page](https://docs.hyperstack.cloud/docs/hardware/gpu-stock-information/)
[Pricing](https://www.hyperstack.cloud/gpu-pricing)

Lambda's public on-demand catalog does not list H200. Its H200 offering is a
1-Click Cluster product billed in weekly reservation increments, so it is not
suitable for a one-off screen. [Instances](https://lambda.ai/instances)
[Billing](https://docs.lambda.ai/public-cloud/billing/)

## Cold-start economics

The official FP8 repository contains 681,542,908,857 bytes across 283 files
(about 681.5 GB decimal / 634.8 GiB). Mistral explicitly supports it on one
8xH200 node with vLLM tensor parallelism of eight. A 900 GB volume is adequate
but leaves only about 218 GB for the container, Hub metadata, and runtime files;
do not keep a second copy of the weights. [Model card and deployment command](https://huggingface.co/mistralai/Mistral-Large-3-675B-Instruct-2512)
[Repository metadata API](https://huggingface.co/api/models/mistralai/Mistral-Large-3-675B-Instruct-2512?blobs=true)

For the live Vast offers, the provider-reported link rates imply an 11-14 minute
best-case checkpoint transfer. Real cold start will be longer because the repo
has 272 weight shards and the container may need a fresh pull. Vast documents
fresh image pulls taking 10-60 minutes. [Vast quickstart](https://docs.vast.ai/guides/get-started/quickstart)

The cheapest Vast Italy offer was $32.07/hour, but it charged $0.019274/GB for
downloads, adding about $13.14 for this checkpoint. US offer `20654524` charged
$0.0001285/GB, about $0.09, so it is cheaper for the first run despite the
higher hourly rate.

## Credential and launch blockers

No provider credential or CLI was present locally for Runpod, Vast, Verda, or
Nebius. The Vast route needs one manual account step: verify and fund the
account, add the existing SSH public key, and create a dedicated API key with
only `misc`, `instance_read`, and `instance_write`. Store it in Vast's standard
`~/.config/vastai/vast_api_key` path with mode 0600; never put it in the repo,
command history, or instance environment. [Vast API-key guidance](https://docs.vast.ai/guides/reference/api-keys)

Before accepting an offer, re-query and assert all of: verified, rentable,
on-demand, datacenter/Secure Cloud, eight H200s on one host, full-GPU fraction,
900 GB available storage, direct SSH, and measured NVLink. Create with
`cancel_unavail=true` so a stale offer fails instead of silently changing the
machine. Pin the vLLM image digest, request SSH-direct runtime and 900 GB disk,
and expose no model-server port; use an SSH loopback tunnel.

The live Vast host reports driver 570.148.08 while the pinned vLLM 0.27.1 image
uses CUDA 13.0.2. The image metadata explicitly admits 570-series drivers, and
vLLM documents its included forward-compatibility libraries for professional
and datacenter GPUs. Set `VLLM_ENABLE_CUDA_COMPATIBILITY=1`, then prove
`torch.cuda.is_available()`, all eight H200s, NVLink topology, peer access, and
adequate `/dev/shm` before starting the 681 GB download. [vLLM older-driver documentation](https://docs.vllm.ai/en/stable/getting_started/installation/gpu/)

Vast has no provider-side termination timer. Arm both a local four-hour
watchdog and an in-instance self-destroy fallback immediately after creation.
Stopping is not teardown: destroy the contract through the API, then verify its
ID is absent from active instances because stopped storage continues billing.
[Vast destroy API](https://docs.vast.ai/api-reference/instances/destroy-instance)

## Reproducible live queries

Runpod:

```graphql
query {
  gpuTypes(input: { id: "NVIDIA H200" }) {
    lowestPrice(input: { gpuCount: 8 }) {
      stockStatus
      uninterruptablePrice
      availableGpuCounts
    }
    secure: lowestPrice(input: { gpuCount: 8, secureCloud: true }) {
      stockStatus
      uninterruptablePrice
      availableGpuCounts
    }
  }
}
```

Vast.ai search body (the endpoint currently permits read-only searches without
an API key, although its documentation describes authentication):

```json
{
  "limit": 100,
  "type": "ondemand",
  "verified": { "eq": true },
  "rentable": { "eq": true },
  "rented": { "eq": false },
  "datacenter": { "eq": true },
  "gpu_name": { "eq": "H200" },
  "num_gpus": { "eq": 8 },
  "allocated_storage": 900,
  "order": [["dph_total", "asc"]]
}
```
