{{/* Concatinate a list of strings delmited with a comma */}}
{{- define "util.joinListWithComma" -}}            
{{- $local := dict "first" true -}}
{{- range $k, $v := . -}}{{- if not $local.first -}},{{- end -}}{{- $v -}}{{- $_ := set $local "first" false -}}{{- end -}}
{{- end -}}