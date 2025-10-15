<div align="center">

<a href="https://email.longppham5.xyz" target="_blank">
</a>

# Temporary Email


Open-source temporary email service that provides quick, anonymous email solutions.

<a href="https://tempmail.longppham5.xyz" target="_blank">
    Website
</a>
•
<a href="https://tempmail.longppham5.xyz/api" target="_blank">
    API Docs
</a>

</div>


---

## Dockerized Installation (Coming Soon)

**Status: Under Development**

- Complete Docker containerization is in progress
- Will include Postfix mail server
- One-click deployment
- Simplified configuration
- Expected features:
  - Pre-configured Postfix
  - Integrated webhook
  - Easy environment setup

## Manual Installation

### Prerequisites

- **Domain**: longppham5.xyz
- **DNS Provider**: Namecheap
- **Server**: K8s Cluster
- **Mail Server Software**: Postfix

---

### Step 1: DNS Configuration (Cloudflare)

1. Log in to your Namecheap account
2. Select your domain (longppham5.xyz)

   **Note**: In all the following steps, replace `longppham5.xyz` with your domain name.

3. Go to the DNS settings
4. Add the following records:
   - MX record:
     - Name: `@`
     - Value: `mail.longppham5.xyz`
     - Priority: 10
   - A record:
     - Name: `mail`
     - Value: `[Your VPS IP address]`
   - TXT record (for SPF):
     - Name: `@`
     - Value: `v=spf1 mx ~all`

---

### Step 2: Postfix and Monitor Setup 
1. Clone Ansible roles
   ```bash
   git clone https://gitlab.com/longpham5-group/roles.git
   ```
2. Use Ansible role to setup Postfix server
   ansible-playbook postfix-install.yaml

---
### Step 3: Install ingress-nginx and cert-manager via Helm
1. Add repo ingress-nginx
   ```bash
   helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
   ```
2. Update repo
   ```bash
   helm repo update
   ```
3. Install ingress-nginx in cluster
   ```bash
   helm install ingress-nginx ingress-nginx/ingress-nginx --namespace ingress-nginx --create-namespace
   ```
4. Add repo cert-manager
   ```bash
   helm repo add jetstack https://charts.jetstack.io
   ```
5. Update repo
   ```bash
   helm repo update
   ```
6. Install cert-manager
   ```bash
   helm install cert-manager jetstack/cert-manager \
   --namespace cert-manager --create-namespace \
   --version v1.14.1 \
   --set installCRDs=true
   ```
7. Apply ClusterIssuer
   ```bash
   apiVersion: cert-manager.io/v1
   kind: ClusterIssuer
   metadata:
   name: letsencrypt-staging
   spec:
   acme:
      server: https://acme-staging-v02.api.letsencrypt.org/directory
      email: youemail@domain.com
      privateKeySecretRef:
         name: letsencrypt-staging-account-key
      solvers:
         - http01:
            ingress:
               class: nginx
   ```
   ```bash
   kubectl apply -f staging-ClusterIssuer.yaml
   ```
   If test successfully, switch to production by using https://acme-v02.api.letsencrypt.org/directory in the server field and a new secret name
   ```bash
   apiVersion: cert-manager.io/v1
   kind: ClusterIssuer
   metadata:
   name: letsencrypt-production
   spec:
   acme:
      server: https://acme-v02.api.letsencrypt.org/directory
      email: youremail@example.com
      privateKeySecretRef:
         name: letsencrypt-prod-account-key
      solvers:
         - http01:
            ingress:
               class: nginx
   ```
   ```bash
   kubectl apply -f production-ClusterIssuer.yaml
   ```

### Step 4: Install and Configure Website via Argocd

1. Clone helm chart repository:
   ```bash
   git clone https://gitlab.com/longpham5-group/helm-tempmail.git
   ```
2. Install argocd
   ```bash
   cd helm-tempmail/argocd
   helm repo add argo https://argoproj.github.io/argo-helm
   helm repo update
   helm install argocd argo/argo-cd -f values.yaml --namespace argocd --create-namespace
   ```
3. Login argocd in browser
   ```bash
   kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d && echo
   ```
4. Install application, database and monitor
   ```bash
   git clone https://gitlab.com/longpham5-group/argocd.git
   cd argocd
   kubectl apply -f ssh-cred.yaml
   kubectl create namespace monitoring
   kubectl apply -f monitoring.yaml
   kubectl apply -f applicationSet-prod.yaml
   ```
---

## License
