from django.shortcuts import render, redirect
from aws.models import Basic, Finger, Number
import json
from django.contrib.auth.models import User
from django.contrib import auth
from django.utils.safestring import mark_safe
from django.http import JsonResponse
from .bin.nlp import NLP
from .bin.similarityVoca import SimilarytyWord
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

global nlp
nlp = NLP()


def matchingSign(Morpheme_path):   
    print('##Match Sign Start...')
    line = Morpheme_path
    results = []
    words = line[0]
    idx=0
    not_found=[]
    pass_word=[]
    nums=['1','2','3','4','5','6','7','8','9','10','100','1000','10000','0']

    for word in words:
        idx+=1
        try:
        # 형태소가 숫자일 때,
            if word[0] in nums:
                
                num_word=word.split()
                if num_word[0] == '5.18':
                    pass
                else :
                    try:
                        for word in num_word:
                            find_word = Number.objects.get(word=word)
                            results.append(find_word.location)
                            print(find_word)
                            pass_word.append(word)
                    except :
                        for word in num_word:
                            for str in word:
                                find_word = Number.objects.get(word=str)
                                results.append(find_word.location)
                                print(find_word)
                                pass_word.append(word)
                

            # 형태소가 DB 검색 시 1개 일 때,
            elif Basic.objects.filter(word=word).count() == 1:
                find_word = Basic.objects.get(word=word)
                results.append(find_word.location)
                print(find_word,find_word.mean)
                pass_word.append(word)

            # 형태소가 DB 검색 시 2개 일 때,
            elif Basic.objects.filter(word=word).count() == 2:
                find_word = Basic.objects.filter(word=word)
                results.append(find_word[0].location)
                print(find_word[0],find_word[0].mean)
                pass_word.append(word)

            # 형태소가 DB 검색 시 여러 개 일 때,
            elif Basic.objects.filter(word=word).count() > 2:
                find_word = Basic.objects.filter(word=word)
                
                

    # ===============================================================================================
                # 명사 list, 왼쪽 오른쪽 명사거리, 명사, 참조단어 list, href list
                noun = []
                nounSub = []
                refList = []
                locationList = []
                mean_list=[]
                N=''
                # 품사 리스트
                parts = line[1]  # 품사

                # 해당 단어의 왼쪽 방향 가까운 명사 찾기.
                for i in range(idx-2, -1, -1):
                    if(parts[i] == "명사"):
                        noun.append(words[i])
                        nounSub.append(idx - i -1)
                        break
                

                # 해당 단어의 오른쪽 방향 가까운 명사 찾기
                for i in range(idx, len(parts)):
                    if(parts[i] == "명사"):

                        noun.append(words[i])
                        nounSub.append(i-idx+1)
                        break

                if len(nounSub) > 1 :
                    if(nounSub[0]>nounSub[1]):
                        N = noun[1]
                    else :
                        N = noun[0]
                elif len(nounSub) == 1:
                    N = noun[0]
                else:
                    results.append(find_word[0].location)
                    pass_word.append(word)
                    continue

                # 같은 품사 갯수
                samePart = 0
                href = ''
                # 일차적으로 품사가 일치하는 단어로 반환
                for result in find_word:
                    part_list=[]
                    if result.mean in mean_list:
                        continue
                    if result.part == parts[idx-1]:
                        samePart += 1
                        href = result.location
                    pre_text= nlp.relocateMorpheme(result.mean)
                    for i in range(len(pre_text[1])):
                        if pre_text[1][i] =='명사':
                            part_list.append(pre_text[0][i])
                    mean_list.append(result.mean)
                    refList.append(part_list[0])
                    locationList.append(result.location)
                    
                if(samePart == 1):
                    results.append(href)
                    pass_word.append(word)
                else:
                    print(f'동음이의어 단어 : {word}, refList : {refList}, 가장 가까운 명사 : {N}')
                    sim = SimilarytyWord()
                    n = sim.calc_similarity(N, refList)
                    if(n == -1):
                        results.append(locationList[0])
                        pass_word.append(word)
                    else:
                        pass_word.append(word)
            else :
                not_found.append(word)
        except:
            continue
        

    print(results)
    print('##Match Sign End')
    return results, not_found, pass_word

# Create your views here.
def home(request):
    
    return render(request, 'home.html')

def test(request):
    
    return render(request, 'test.html')

def lesson(request):

    return render(request, 'lesson.html')

@csrf_exempt
def result(request):
    default_video='aws/media/sign/basic/24224.mp4'

    text = request.POST.get('text1')
    
    print('text : ',text)
    pre_text= nlp.relocateMorpheme(text)
    print('pre_text : ',pre_text)

    result, not_found_word, pass_word_list = matchingSign(pre_text)
    print('href_list : ',result)
    print('없는 단어 리스트 : ',not_found_word)
    print('있는 단어 : ',pass_word_list)
    if result == []:
        result.append(default_video)

    context={
        'q':result
    }
    return JsonResponse(context)


ERROR_MSG = {
    'ID_EXIST': '이미 사용 중인 아이디 입니다.',
    'ID_NOT_EXIST': '존재하지 않는 아이디 입니다',
    'ID_PW_MISSING': '아이디와 비밀번호를 다시 확인해주세요.',
    'PW_CHECK': '비밀번호가 일치하지 않습니다.',
}

def signup(request):

    context = {
        'error': {
            'state': False,
            'msg': ''
        }
    }
    if request.method == 'POST':
        
        user_id = request.POST['user_id']
        user_pw = request.POST['user_pw']
        user_pw_check = request.POST['user_pw_check']

        if (user_id and user_pw):

            user = User.objects.filter(username=user_id)

            if len(user) == 0:

                if (user_pw == user_pw_check):

                    created_user = User.objects.create_user(
                        username=user_id,
                        password=user_pw
                    )

                    auth.login(request, created_user)
                    return redirect('home')
                else:
                    context['error']['state'] = True
                    context['error']['msg'] = ERROR_MSG['PW_CHECK']
            else:
                context['error']['state'] = True
                context['error']['msg'] = ERROR_MSG['ID_EXIST']
        else:
            context['error']['state'] = True
            context['error']['msg'] = ERROR_MSG['ID_PW_MISSING']

    return render(request, 'signup.html', context)

def login(request):
    context = {
        'error': {
            'state': False,
            'msg': ''
        },
    }

    if request.method == 'POST':
        user_id = request.POST['user_id']
        user_pw = request.POST['user_pw']

        user = User.objects.filter(username=user_id)

        if (user_id and user_pw):
            if len(user) != 0:
                user = auth.authenticate(
                    username=user_id,
                    password=user_pw
                )

                if user != None:
                    auth.login(request, user)

                    return redirect('home')
                else:
                    context['error']['state'] = True
                    context['error']['msg'] = ERROR_MSG['PW_CHECK']
            else:
                context['error']['state'] = True
                context['error']['msg'] = ERROR_MSG['ID_NOT_EXIST']
        else:
            context['error']['state'] = True
            context['error']['msg'] = ERROR_MSG['ID_PW_MISSING']

    return render(request, 'login.html', context)

def logout(request):
    auth.logout(request)

    return redirect('home')        